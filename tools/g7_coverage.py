#!/usr/bin/env python3
"""Deterministic manifest, snapshot, aggregation, and publication tooling for G7."""

from __future__ import annotations

import argparse
import hashlib
import json
import math
import os
import subprocess
from datetime import datetime, timezone
from dataclasses import dataclass
from decimal import Decimal, ROUND_HALF_UP
from pathlib import Path, PurePosixPath
from typing import Any, Iterable


TARGETS = {
    "backend": {"lines": 80, "branches": 75},
    "frontend": {"lines": 70, "branches": 65},
    "user": {"lines": 90, "branches": 85},
    "diet": {"lines": 90, "branches": 85},
}
FRONTEND_EXTENSIONS = {".js", ".jsx", ".ts", ".tsx"}
SUPPORTED_COVERAGE_FORMATS = {3}
SUPPORTED_COVERAGE_VERSION_PREFIXES = ("7.",)
SUPPORTED_JEST_VERSION_PREFIXES = ("29.",)
SUPPORTED_ISTANBUL_VERSION_PREFIXES = ("3.",)
SNAPSHOT_SCHEMA = "g7-snapshot/v1"
RESULT_SCHEMA = "g7-result/v2"


class CoverageContractError(ValueError):
    """Raised when a report violates the frozen measurement contract."""


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def canonical_hash(entries: Iterable[dict[str, Any]]) -> str:
    payload = json.dumps(list(entries), ensure_ascii=False, sort_keys=True, separators=(",", ":"))
    return hashlib.sha256(payload.encode()).hexdigest()


def rel(path: Path, root: Path) -> str:
    return path.resolve().relative_to(root.resolve()).as_posix()


def is_frontend_test(path: PurePosixPath) -> bool:
    name = path.name
    return "__tests__" in path.parts or any(
        name.endswith(f".{marker}{extension}")
        for marker in ("test", "spec")
        for extension in FRONTEND_EXTENSIONS
    )


def frontend_technical_exclusion(path: PurePosixPath) -> str | None:
    if path.name.endswith(".d.ts"):
        return "declaration"
    if path.name == "index.ts":
        return "barrel-index"
    if "shims" in path.parts:
        return "shim"
    return None


def classify_files(root: Path) -> dict[str, list[dict[str, str]]]:
    groups: dict[str, list[dict[str, str]]] = {
        "backend_product": [],
        "backend_tests": [],
        "frontend_product": [],
        "frontend_tests": [],
        "frontend_technical_exclusions": [],
    }

    for path in sorted((root / "backend/app").rglob("*.py")):
        groups["backend_product"].append({"path": rel(path, root), "sha256": sha256_file(path)})
    for path in sorted((root / "backend/tests").rglob("*.py")):
        groups["backend_tests"].append({"path": rel(path, root), "sha256": sha256_file(path)})

    frontend_root = root / "kelpus/src"
    for path in sorted(p for p in frontend_root.rglob("*") if p.is_file() and p.suffix in FRONTEND_EXTENSIONS):
        relative = PurePosixPath(rel(path, root))
        entry = {"path": relative.as_posix(), "sha256": sha256_file(path)}
        if is_frontend_test(relative):
            groups["frontend_tests"].append(entry)
            continue
        reason = frontend_technical_exclusion(relative)
        if reason:
            groups["frontend_technical_exclusions"].append({**entry, "reason": reason})
            continue
        groups["frontend_product"].append(entry)

    # Jest apparatus outside src still affects execution and snapshot identity.
    kelpus_root = root / "kelpus"
    for path in sorted(p for p in kelpus_root.rglob("*") if p.is_file()):
        relative = PurePosixPath(rel(path, root))
        if "node_modules" in relative.parts or "coverage" in relative.parts or "src" in relative.parts:
            continue
        if is_frontend_test(relative) or "__mocks__" in relative.parts:
            groups["frontend_tests"].append({"path": relative.as_posix(), "sha256": sha256_file(path)})

    return groups


def _git_metadata(root: Path) -> dict[str, Any]:
    def git(*args: str) -> str:
        return subprocess.run(
            ["git", *args], cwd=root, check=True, text=True, stdout=subprocess.PIPE
        ).stdout

    status = git("status", "--porcelain=v1", "--untracked-files=all")
    return {
        "head_sha": git("rev-parse", "HEAD").strip(),
        "dirty": bool(status),
        "git_status_sha256": hashlib.sha256(status.encode()).hexdigest(),
    }


def build_snapshot(root: Path, groups: dict[str, list[dict[str, str]]]) -> dict[str, Any]:
    infrastructure = []
    for relative in (
        "backend/.coveragerc",
        "backend/requirements.txt",
        "backend/requirements-test.txt",
        "kelpus/package.json",
        "kelpus/package-lock.json",
        "kelpus/babel.config.js",
        "kelpus/metro.config.js",
        "kelpus/react-native.config.js",
        "tools/g7_coverage.py",
    ):
        path = root / relative
        if path.exists():
            infrastructure.append({"path": relative, "sha256": sha256_file(path)})
    for path in sorted((root / "tools/tests").rglob("*.py")):
        infrastructure.append({"path": rel(path, root), "sha256": sha256_file(path)})
    snapshot_entries = []
    class_names = {
        "backend_product": "backend_product",
        "backend_tests": "backend_test",
        "frontend_product": "frontend_product",
        "frontend_tests": "frontend_test",
        "frontend_technical_exclusions": "technical_exclusion",
    }
    for category in sorted(groups):
        snapshot_entries.extend({"class": class_names[category], **entry} for entry in groups[category])
    for entry in infrastructure:
        path = entry["path"]
        if path.endswith("package-lock.json"):
            kind = "lockfile"
        elif path.endswith(("requirements.txt", "requirements-test.txt", "package.json")):
            kind = "dependency_manifest"
        elif path.startswith("tools/"):
            kind = "tooling"
        else:
            kind = "coverage_config"
        snapshot_entries.append({"class": kind, **entry})
    metadata = _git_metadata(root)
    input_files = sorted(snapshot_entries, key=lambda entry: (entry["class"], entry["path"]))
    identity = {"snapshot_schema": SNAPSHOT_SCHEMA, **metadata, "input_files": input_files}
    return {
        **identity,
        "snapshot_id": hashlib.sha256(
            json.dumps(identity, ensure_ascii=False, sort_keys=True, separators=(",", ":")).encode()
        ).hexdigest(),
        "groups": groups,
        "infrastructure": infrastructure,
    }


def _normalize_backend_report_path(raw: str) -> str:
    path = PurePosixPath(raw.replace("\\", "/"))
    parts = list(path.parts)
    if ".." in parts or "app" not in parts:
        raise CoverageContractError(f"backend report path is outside app: {raw}")
    return PurePosixPath(*parts[parts.index("app") :]).as_posix()


def _normalize_frontend_report_path(raw: str) -> str:
    path = PurePosixPath(raw.replace("\\", "/"))
    parts = list(path.parts)
    if ".." in parts or "src" not in parts:
        raise CoverageContractError(f"frontend report path is outside src: {raw}")
    return PurePosixPath(*parts[parts.index("src") :]).as_posix()


@dataclass(frozen=True)
class Counts:
    covered_lines: int = 0
    total_lines: int = 0
    covered_branches: int = 0
    total_branches: int = 0

    def __add__(self, other: "Counts") -> "Counts":
        return Counts(
            self.covered_lines + other.covered_lines,
            self.total_lines + other.total_lines,
            self.covered_branches + other.covered_branches,
            self.total_branches + other.total_branches,
        )


def _integer(value: Any, label: str) -> int:
    if isinstance(value, bool) or not isinstance(value, int) or value < 0:
        raise CoverageContractError(f"{label} must be a non-negative integer")
    return value


def _backend_counts(summary: dict[str, Any], label: str) -> Counts:
    return Counts(
        _integer(summary.get("covered_lines"), f"{label}.covered_lines"),
        _integer(summary.get("num_statements"), f"{label}.num_statements"),
        _integer(summary.get("covered_branches"), f"{label}.covered_branches"),
        _integer(summary.get("num_branches"), f"{label}.num_branches"),
    )


def _validate_version(value: str | None, prefixes: tuple[str, ...], label: str) -> None:
    if value is not None and not value.startswith(prefixes):
        raise CoverageContractError(f"unsupported {label} version: {value}")


def parse_backend(path: Path, expected: set[str], coverage_version: str | None = None) -> tuple[dict[str, Counts], str]:
    _validate_version(coverage_version, SUPPORTED_COVERAGE_VERSION_PREFIXES, "coverage.py")
    report = json.loads(path.read_text())
    meta = report.get("meta", {})
    if meta.get("format") not in SUPPORTED_COVERAGE_FORMATS or meta.get("branch_coverage") is not True:
        raise CoverageContractError("unsupported coverage.py JSON schema or branch coverage disabled")
    files = report.get("files")
    if not isinstance(files, dict):
        raise CoverageContractError("coverage.py files must be an object")
    normalized: dict[str, Counts] = {}
    for raw, record in files.items():
        name = _normalize_backend_report_path(raw)
        if name in normalized:
            raise CoverageContractError(f"duplicate normalized backend path: {name}")
        normalized[name] = _backend_counts(record.get("summary", {}), name)
    if set(normalized) != expected:
        raise CoverageContractError(f"backend file set mismatch: missing={sorted(expected-set(normalized))}, extra={sorted(set(normalized)-expected)}")
    whole = sum(normalized.values(), Counts())
    reported_total = _backend_counts(report.get("totals", {}), "totals")
    if whole != reported_total:
        raise CoverageContractError(f"backend per-file totals do not reconcile: {whole} != {reported_total}")
    scopes = {
        "backend": whole,
        "user": sum((value for name, value in normalized.items() if name.startswith("app/domains/user/")), Counts()),
        "diet": sum((value for name, value in normalized.items() if name.startswith("app/domains/diet/")), Counts()),
    }
    return scopes, sha256_file(path)


def _frontend_counts(record: dict[str, Any], label: str) -> Counts:
    statements = record.get("statementMap")
    statement_hits = record.get("s")
    branch_map = record.get("branchMap")
    branches = record.get("b")
    if not all(isinstance(value, dict) for value in (statements, statement_hits, branch_map, branches)):
        raise CoverageContractError(f"{label} is not Istanbul coverage-final schema")
    if set(statements) != set(statement_hits) or set(branch_map) != set(branches):
        raise CoverageContractError(f"{label} Istanbul map/hit keys do not match")
    line_hits: dict[int, int] = {}
    for key, location in statements.items():
        try:
            line = int(location["start"]["line"])
            hits = _integer(statement_hits[key], f"{label}.s.{key}")
        except (KeyError, TypeError, ValueError) as exc:
            raise CoverageContractError(f"invalid Istanbul statement entry: {label}.{key}") from exc
        line_hits[line] = max(line_hits.get(line, 0), hits)
    branch_values = []
    for key, hits in branches.items():
        if not isinstance(hits, list):
            raise CoverageContractError(f"{label}.b.{key} must be an array")
        locations = branch_map[key].get("locations")
        if not isinstance(locations, list) or len(locations) != len(hits):
            raise CoverageContractError(f"{label}.branchMap.{key} outcome count mismatch")
        for outcome, location in enumerate(locations):
            _branch_line(branch_map[key], location, f"{label}.branchMap.{key}.{outcome}")
        branch_values.extend(_integer(hit, f"{label}.b.{key}") for hit in hits)
    return Counts(
        sum(hit > 0 for hit in line_hits.values()),
        len(line_hits),
        sum(hit > 0 for hit in branch_values),
        len(branch_values),
    )


def _branch_line(branch: dict[str, Any], location: Any, label: str) -> int:
    candidates = []
    if isinstance(location, dict):
        candidates.append(location.get("start", {}).get("line"))
    candidates.extend((branch.get("loc", {}).get("start", {}).get("line"), branch.get("line")))
    for value in candidates:
        if isinstance(value, int) and value > 0:
            return value
    raise CoverageContractError(f"{label} has no stable source line")


def parse_frontend(
    final_path: Path,
    summary_path: Path,
    expected: set[str],
    jest_version: str | None = None,
    istanbul_version: str | None = None,
) -> tuple[Counts, str]:
    _validate_version(jest_version, SUPPORTED_JEST_VERSION_PREFIXES, "Jest")
    _validate_version(istanbul_version, SUPPORTED_ISTANBUL_VERSION_PREFIXES, "istanbul-lib-coverage")
    final = json.loads(final_path.read_text())
    summary = json.loads(summary_path.read_text())
    if not isinstance(final, dict) or "total" not in summary:
        raise CoverageContractError("unsupported Jest/Istanbul JSON schema")
    normalized: dict[str, Counts] = {}
    for raw, record in final.items():
        name = _normalize_frontend_report_path(raw)
        if name in normalized:
            raise CoverageContractError(f"duplicate normalized frontend path: {name}")
        normalized[name] = _frontend_counts(record, name)
    if set(normalized) != expected:
        raise CoverageContractError(f"frontend file set mismatch: missing={sorted(expected-set(normalized))}, extra={sorted(set(normalized)-expected)}")
    counts = sum(normalized.values(), Counts())
    total = summary["total"]
    summary_counts = Counts(
        _integer(total["lines"]["covered"], "summary.lines.covered"),
        _integer(total["lines"]["total"], "summary.lines.total"),
        _integer(total["branches"]["covered"], "summary.branches.covered"),
        _integer(total["branches"]["total"], "summary.branches.total"),
    )
    if counts != summary_counts:
        raise CoverageContractError(f"frontend final/summary counts do not reconcile: {counts} != {summary_counts}")
    return counts, sha256_file(final_path)


def metric(covered: int, total: int, target: int) -> dict[str, Any]:
    if total <= 0:
        raise CoverageContractError("aggregate denominator must be positive")
    passed = covered * 100 >= target * total
    exact = Decimal(covered * 100) / Decimal(total)
    display = str(exact.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP))
    return {
        "covered": covered,
        "total": total,
        "target_percent": target,
        "display_pct": display,
        "pct": float(display),
        "target": target,
        "target_status": "pass" if passed else "fail",
        "needed": max(0, math.ceil((target * total - covered * 100) / 100)),
    }


def result_scope(name: str, counts: Counts, report_hash: str) -> dict[str, Any]:
    lines = metric(counts.covered_lines, counts.total_lines, TARGETS[name]["lines"])
    branches = metric(counts.covered_branches, counts.total_branches, TARGETS[name]["branches"])
    return {
        "scope": name,
        "measurement_status": "valid",
        "invalid_reasons": [],
        "source_report_sha256": report_hash,
        "lines": lines,
        "branches": branches,
        "target_status": "pass" if lines["target_status"] == branches["target_status"] == "pass" else "fail",
        "row_target_status": "pass" if lines["target_status"] == branches["target_status"] == "pass" else "fail",
    }


def atomic_publish(staging: Path, destination: Path) -> None:
    if not staging.is_dir() or (staging / "COMPLETE").exists():
        raise CoverageContractError("staging directory missing or already marked complete")
    if destination.exists():
        raise CoverageContractError(f"destination already exists: {destination}")
    destination.parent.mkdir(parents=True, exist_ok=True)
    if staging.stat().st_dev != destination.parent.stat().st_dev:
        raise CoverageContractError("staging and destination must be on the same filesystem")
    hashes = {}
    for path in sorted(staging.rglob("*")):
        if path.is_file():
            hashes[path.relative_to(staging).as_posix()] = sha256_file(path)
            with path.open("rb") as handle:
                os.fsync(handle.fileno())
    bundle = staging / "BUNDLE_SHA256.json"
    bundle.write_text(json.dumps(hashes, sort_keys=True, indent=2) + "\n")
    with bundle.open("rb") as handle:
        os.fsync(handle.fileno())
    for relative, expected in hashes.items():
        if sha256_file(staging / relative) != expected:
            raise CoverageContractError(f"bundle hash changed before publish: {relative}")
    directory_fd = os.open(staging, os.O_RDONLY)
    try:
        os.fsync(directory_fd)
    finally:
        os.close(directory_fd)
    os.replace(staging, destination)
    parent_fd = os.open(destination.parent, os.O_RDONLY)
    try:
        os.fsync(parent_fd)
    finally:
        os.close(parent_fd)
    marker_tmp = destination / ".COMPLETE.tmp"
    marker_tmp.write_text("validated\n")
    with marker_tmp.open("rb") as handle:
        os.fsync(handle.fileno())
    os.replace(marker_tmp, destination / "COMPLETE")
    destination_fd = os.open(destination, os.O_RDONLY)
    try:
        os.fsync(destination_fd)
    finally:
        os.close(destination_fd)


def build_run_record(
    *,
    run_id: str,
    phase: str,
    domain: str,
    cwd: Path,
    argv: list[str],
    started_at: str,
    ended_at: str,
    exit_code: int,
    stdout: Path,
    stderr: Path,
    reports: list[Path],
    pre_snapshot: Path,
    post_snapshot: Path,
    manifest: Path,
    configs: list[Path],
    tool_versions: dict[str, str],
) -> dict[str, Any]:
    pre = json.loads(pre_snapshot.read_text())
    post = json.loads(post_snapshot.read_text())
    if pre.get("snapshot_id") != post.get("snapshot_id"):
        raise CoverageContractError("pre/post snapshot mismatch")
    if exit_code != 0:
        raise CoverageContractError(f"authoritative run failed with exit code {exit_code}")
    artifacts = [stdout, stderr, *reports]
    missing = [str(path) for path in artifacts if not path.is_file()]
    if missing:
        raise CoverageContractError(f"run artifacts missing: {missing}")
    return {
        "run_schema": "g7-run/v1",
        "run_id": run_id,
        "phase": phase,
        "domain": domain,
        "cwd": str(cwd.resolve()),
        "argv": argv,
        "started_at_utc": started_at,
        "ended_at_utc": ended_at,
        "exit_code": exit_code,
        "stdout_sha256": sha256_file(stdout),
        "stderr_sha256": sha256_file(stderr),
        "report_sha256": {path.name: sha256_file(path) for path in reports},
        "pre_snapshot_id": pre["snapshot_id"],
        "post_snapshot_id": post["snapshot_id"],
        "manifest_sha256": sha256_file(manifest),
        "config_sha256": {str(path): sha256_file(path) for path in configs},
        "tool_versions": tool_versions,
    }


def frontend_uncovered_units(final_path: Path) -> list[dict[str, Any]]:
    report = json.loads(final_path.read_text())
    units: list[dict[str, Any]] = []
    for raw, record in sorted(report.items()):
        path = _normalize_frontend_report_path(raw)
        statements = record.get("statementMap", {})
        statement_hits = record.get("s", {})
        _frontend_counts(record, path)
        line_hits: dict[int, list[int]] = {}
        for key, location in statements.items():
            line = int(location["start"]["line"])
            line_hits.setdefault(line, []).append(statement_hits[key])
        for line, hits in sorted(line_hits.items()):
            if not any(hits):
                units.append({
                    "id": f"frontend:lines:{path}:line:{line}",
                    "metric": "lines", "path": path, "line": line,
                })
        for key, branch in sorted(record["branchMap"].items(), key=lambda item: int(item[0])):
            for outcome, (location, hit) in enumerate(zip(branch["locations"], record["b"][key])):
                if not hit:
                    line = _branch_line(branch, location, f"{path}.branchMap.{key}.{outcome}")
                    units.append({
                        "id": f"frontend:branches:{path}:branch:{key}:outcome:{outcome}:line:{line}",
                        "metric": "branches", "path": path, "line": line,
                        "branch": key, "outcome": outcome,
                    })
    return units


def secret_scan(root: Path, env_files: list[Path]) -> dict[str, Any]:
    needles: set[bytes] = set()
    for env_file in env_files:
        if not env_file.is_file():
            continue
        for raw in env_file.read_bytes().splitlines():
            line = raw.strip()
            if line and not line.startswith(b"#") and b"=" in line:
                value = line.split(b"=", 1)[1].strip().strip(b"\"'")
                if len(value) >= 8:
                    needles.add(value)
    findings = []
    for path in sorted(root.rglob("*")):
        if not path.is_file():
            continue
        data = path.read_bytes()
        for needle in needles:
            if needle in data:
                findings.append({"path": path.relative_to(root).as_posix(), "value_sha256": hashlib.sha256(needle).hexdigest()})
    return {
        "scan_schema": "g7-secret-scan/v1",
        "scanned_at_utc": datetime.now(timezone.utc).isoformat(),
        "files_scanned": sum(path.is_file() for path in root.rglob("*")),
        "secret_value_hashes_checked": len(needles),
        "findings": findings,
        "status": "pass" if not findings else "fail",
    }


def command_manifest(args: argparse.Namespace) -> None:
    root = Path(args.root).resolve()
    snapshot = build_snapshot(root, classify_files(root))
    Path(args.output).write_text(json.dumps(snapshot, ensure_ascii=False, indent=2) + "\n")


def command_aggregate(args: argparse.Namespace) -> None:
    manifest = json.loads(Path(args.manifest).read_text())
    groups = manifest["groups"]
    backend_expected = {PurePosixPath(entry["path"]).relative_to("backend").as_posix() for entry in groups["backend_product"]}
    frontend_expected = {PurePosixPath(entry["path"]).relative_to("kelpus").as_posix() for entry in groups["frontend_product"]}
    backend_scopes, backend_hash = parse_backend(Path(args.backend), backend_expected, args.coverage_version)
    frontend_counts, frontend_hash = parse_frontend(
        Path(args.frontend_final), Path(args.frontend_summary), frontend_expected,
        args.jest_version, args.istanbul_version,
    )
    scopes = {name: result_scope(name, counts, backend_hash) for name, counts in backend_scopes.items()}
    scopes["frontend"] = result_scope("frontend", frontend_counts, frontend_hash)
    result = {
        "result_schema": RESULT_SCHEMA,
        "snapshot_id": manifest["snapshot_id"],
        "measurement_status": "valid",
        "invalid_reasons": [],
        "target_status": "pass" if all(scope["target_status"] == "pass" for scope in scopes.values()) else "fail",
        "documentation_status": args.documentation_status,
        "scopes": scopes,
    }
    Path(args.output).write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n")


def command_publish(args: argparse.Namespace) -> None:
    atomic_publish(Path(args.staging), Path(args.destination))


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser()
    sub = parser.add_subparsers(dest="command", required=True)
    manifests = sub.add_parser("manifest")
    manifests.add_argument("--root", default=".")
    manifests.add_argument("--output", required=True)
    manifests.set_defaults(func=command_manifest)
    aggregate = sub.add_parser("aggregate")
    aggregate.add_argument("--manifest", required=True)
    aggregate.add_argument("--backend", required=True)
    aggregate.add_argument("--frontend-final", required=True)
    aggregate.add_argument("--frontend-summary", required=True)
    aggregate.add_argument("--documentation-status", choices=("updated", "blocked_missing_source", "pending"), default="pending")
    aggregate.add_argument("--coverage-version", required=True)
    aggregate.add_argument("--jest-version", required=True)
    aggregate.add_argument("--istanbul-version", required=True)
    aggregate.add_argument("--output", required=True)
    aggregate.set_defaults(func=command_aggregate)
    publish = sub.add_parser("publish")
    publish.add_argument("--staging", required=True)
    publish.add_argument("--destination", required=True)
    publish.set_defaults(func=command_publish)
    return parser


def main() -> None:
    args = build_parser().parse_args()
    args.func(args)


if __name__ == "__main__":
    main()
