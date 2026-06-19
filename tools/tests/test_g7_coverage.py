import json
import tempfile
import unittest
from pathlib import Path, PurePosixPath

from tools.g7_coverage import (
    Counts,
    CoverageContractError,
    atomic_publish,
    build_run_record,
    build_snapshot,
    classify_files,
    frontend_technical_exclusion,
    is_frontend_test,
    metric,
    parse_backend,
    parse_frontend,
    secret_scan,
)


class ClassificationTest(unittest.TestCase):
    def test_test_artifacts_are_not_runtime_source(self):
        self.assertTrue(is_frontend_test(PurePosixPath("kelpus/src/a/Foo.test.tsx")))
        self.assertTrue(is_frontend_test(PurePosixPath("kelpus/src/a/__tests__/Foo.ts")))
        self.assertFalse(is_frontend_test(PurePosixPath("kelpus/src/a/Foo.tsx")))

    def test_only_three_technical_exclusion_classes(self):
        self.assertEqual(frontend_technical_exclusion(PurePosixPath("kelpus/src/a/env.d.ts")), "declaration")
        self.assertEqual(frontend_technical_exclusion(PurePosixPath("kelpus/src/a/index.ts")), "barrel-index")
        self.assertEqual(frontend_technical_exclusion(PurePosixPath("kelpus/src/shims/native.js")), "shim")
        self.assertIsNone(frontend_technical_exclusion(PurePosixPath("kelpus/src/a/index.tsx")))


class FormulaTest(unittest.TestCase):
    def test_integer_threshold_does_not_use_rounded_display(self):
        value = metric(89999, 100000, 90)
        self.assertEqual(value["pct"], 90.0)
        self.assertEqual(value["target_status"], "fail")
        self.assertEqual(value["needed"], 1)

    def test_zero_aggregate_is_invalid(self):
        with self.assertRaises(CoverageContractError):
            metric(0, 0, 80)

    def test_display_uses_decimal_half_up(self):
        self.assertEqual(metric(1, 32, 1)["display_pct"], "3.13")


class BackendSchemaTest(unittest.TestCase):
    def test_rejects_unsupported_coverage_version(self):
        with tempfile.TemporaryDirectory() as directory:
            report = Path(directory) / "coverage.json"
            report.write_text("{}")
            with self.assertRaises(CoverageContractError):
                parse_backend(report, set(), "8.0.0")

    def test_rejects_disabled_branch_coverage(self):
        with tempfile.TemporaryDirectory() as directory:
            report = Path(directory) / "coverage.json"
            report.write_text(json.dumps({"meta": {"format": 3, "branch_coverage": False}, "files": {}}))
            with self.assertRaises(CoverageContractError):
                parse_backend(report, set())

    def test_same_report_aggregates_domains(self):
        with tempfile.TemporaryDirectory() as directory:
            report = Path(directory) / "coverage.json"
            report.write_text(json.dumps({
                "meta": {"format": 3, "branch_coverage": True},
                "files": {
                    "app/domains/user/service.py": {"summary": {"covered_lines": 9, "num_statements": 10, "covered_branches": 4, "num_branches": 5}},
                    "app/domains/diet/service.py": {"summary": {"covered_lines": 8, "num_statements": 10, "covered_branches": 3, "num_branches": 5}},
                },
                "totals": {"covered_lines": 17, "num_statements": 20, "covered_branches": 7, "num_branches": 10},
            }))
            scopes, _ = parse_backend(report, {"app/domains/user/service.py", "app/domains/diet/service.py"})
            self.assertEqual(scopes["backend"], Counts(17, 20, 7, 10))
            self.assertEqual(scopes["user"], Counts(9, 10, 4, 5))
            self.assertEqual(scopes["diet"], Counts(8, 10, 3, 5))


class FrontendSchemaTest(unittest.TestCase):
    def _write(self, root, final):
        final_path = root / "final.json"
        summary_path = root / "summary.json"
        final_path.write_text(json.dumps(final))
        summary_path.write_text(json.dumps({"total": {"lines": {"covered": 1, "total": 1}, "branches": {"covered": 1, "total": 1}}}))
        return final_path, summary_path

    def test_rejects_branch_outcome_mismatch(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            final, summary = self._write(root, {"src/a.js": {
                "statementMap": {"0": {"start": {"line": 1}}}, "s": {"0": 1},
                "branchMap": {"0": {"locations": [{"start": {"line": 1}}]}}, "b": {"0": [1, 0]},
            }})
            with self.assertRaises(CoverageContractError):
                parse_frontend(final, summary, {"src/a.js"})

    def test_rejects_traversal_path(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            final, summary = self._write(root, {"../src/a.js": {
                "statementMap": {"0": {"start": {"line": 1}}}, "s": {"0": 1},
                "branchMap": {"0": {"locations": [{"start": {"line": 1}}]}}, "b": {"0": [1]},
            }})
            with self.assertRaises(CoverageContractError):
                parse_frontend(final, summary, {"src/a.js"})

    def test_rejects_unsupported_jest_or_istanbul_version(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            final, summary = self._write(root, {})
            with self.assertRaises(CoverageContractError):
                parse_frontend(final, summary, set(), "30.0.0", "3.2.2")
            with self.assertRaises(CoverageContractError):
                parse_frontend(final, summary, set(), "29.7.0", "4.0.0")


class SnapshotTest(unittest.TestCase):
    def test_snapshot_includes_root_jest_artifacts_and_git_identity(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            (root / "backend/app").mkdir(parents=True)
            (root / "backend/tests").mkdir(parents=True)
            (root / "kelpus/src").mkdir(parents=True)
            (root / "kelpus/__mocks__").mkdir(parents=True)
            (root / "kelpus/__mocks__/native.js").write_text("module.exports = {}")
            import subprocess
            subprocess.run(["git", "init", "-q"], cwd=root, check=True)
            subprocess.run(["git", "config", "user.email", "test@example.com"], cwd=root, check=True)
            subprocess.run(["git", "config", "user.name", "Test"], cwd=root, check=True)
            subprocess.run(["git", "add", "."], cwd=root, check=True)
            subprocess.run(["git", "commit", "-qm", "initial"], cwd=root, check=True)
            snapshot = build_snapshot(root, classify_files(root))
            self.assertEqual(snapshot["snapshot_schema"], "g7-snapshot/v1")
            self.assertFalse(snapshot["dirty"])
            self.assertTrue(any(entry["path"] == "kelpus/__mocks__/native.js" and entry["class"] == "frontend_test" for entry in snapshot["input_files"]))
            (root / "kelpus/__mocks__/native.js").write_text("changed")
            self.assertNotEqual(snapshot["snapshot_id"], build_snapshot(root, classify_files(root))["snapshot_id"])


class RunRecordTest(unittest.TestCase):
    def test_run_record_hashes_provenance(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            for name in ("stdout", "stderr", "report", "config"):
                (root / name).write_text(name)
            snapshot = {"snapshot_id": "abc"}
            for name in ("pre.json", "post.json", "manifest.json"):
                (root / name).write_text(json.dumps(snapshot))
            record = build_run_record(run_id="r1", phase="final", domain="backend", cwd=root,
                argv=["pytest"], started_at="2026-01-01T00:00:00Z", ended_at="2026-01-01T00:01:00Z",
                exit_code=0, stdout=root / "stdout", stderr=root / "stderr", reports=[root / "report"],
                pre_snapshot=root / "pre.json", post_snapshot=root / "post.json", manifest=root / "manifest.json",
                configs=[root / "config"], tool_versions={"pytest": "9"})
            self.assertEqual(record["pre_snapshot_id"], "abc")
            self.assertEqual(record["run_schema"], "g7-run/v1")


class SecretScanTest(unittest.TestCase):
    def test_detects_env_value_without_recording_it(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            evidence = root / "evidence"
            evidence.mkdir()
            env = root / ".env"
            env.write_text("TOKEN=abcdefghijk\n")
            (evidence / "log").write_text("abcdefghijk")
            result = secret_scan(evidence, [env])
            self.assertEqual(result["status"], "fail")
            self.assertNotIn("abcdefghijk", json.dumps(result))


class AtomicPublishTest(unittest.TestCase):
    def test_complete_marker_is_created_last(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            staging = root / "stage"
            destination = root / "published"
            staging.mkdir()
            (staging / "result.json").write_text("{}")
            atomic_publish(staging, destination)
            self.assertTrue((destination / "COMPLETE").is_file())
            manifest = json.loads((destination / "BUNDLE_SHA256.json").read_text())
            self.assertEqual(set(manifest), {"result.json"})
            self.assertFalse(staging.exists())


if __name__ == "__main__":
    unittest.main()
