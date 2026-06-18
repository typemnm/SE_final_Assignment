"""Static and command-flow tests for the production launcher."""

from __future__ import annotations

import os
from pathlib import Path
import stat
import subprocess
import tempfile
import unittest


ROOT = Path(__file__).resolve().parents[2]
SCRIPT = ROOT / "start-server.sh"
EXAMPLE_ENV = ROOT / ".envserver.example"
DOCKERIGNORE = ROOT / "backend" / ".dockerignore"


def run_launcher(env_file: Path, compose_file: Path, docker_bin: Path) -> subprocess.CompletedProcess[str]:
    environment = os.environ.copy()
    environment.update(
        {
            "KELPUS_ENV_FILE": str(env_file),
            "KELPUS_COMPOSE_FILE": str(compose_file),
            "KELPUS_DOCKER_BIN": str(docker_bin),
            "KELPUS_WAIT_ATTEMPTS": "1",
            "KELPUS_WAIT_INTERVAL_SECONDS": "0",
        }
    )
    return subprocess.run(
        [str(SCRIPT)],
        cwd=ROOT,
        env=environment,
        text=True,
        capture_output=True,
        check=False,
    )


def populated_environment() -> str:
    return EXAMPLE_ENV.read_text().replace("CHANGE_ME", "TEST_VALUE").replace(
        "TRUSTED_PROXY_IPS=TEST_VALUE_NPM_LAN_IP_OR_CIDR",
        "TRUSTED_PROXY_IPS=192.0.2.10",
    )


class StartServerScriptTests(unittest.TestCase):
    def test_docker_build_context_excludes_local_secrets(self) -> None:
        patterns = DOCKERIGNORE.read_text().splitlines()

        self.assertIn(".env", patterns)
        self.assertIn(".env.*", patterns)
        self.assertIn("!.env.example", patterns)

    def test_missing_env_fails_before_docker(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            temp = Path(directory)
            result = run_launcher(
                temp / "missing.env",
                ROOT / "docker-compose.server.yml",
                temp / "missing-docker",
            )

        self.assertNotEqual(result.returncode, 0)
        self.assertIn("environment file is missing", result.stderr)
        self.assertNotIn("Docker is not installed", result.stderr)

    def test_placeholder_env_fails_without_printing_value(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            temp = Path(directory)
            env_file = temp / ".envserver"
            env_file.write_text(EXAMPLE_ENV.read_text())
            compose_file = temp / "compose.yml"
            compose_file.write_text("services: {}\n")
            result = run_launcher(env_file, compose_file, temp / "missing-docker")

        self.assertNotEqual(result.returncode, 0)
        self.assertIn("contains a placeholder", result.stderr)
        self.assertNotIn("CHANGE_ME_NPM", result.stderr)

    def test_unrestricted_proxy_trust_is_rejected(self) -> None:
        for unsafe_value in ("*", "0.0.0.0/0", "::/0", "192.0.2.10, *"):
            with self.subTest(unsafe_value=unsafe_value), tempfile.TemporaryDirectory() as directory:
                temp = Path(directory)
                env_file = temp / ".envserver"
                env_file.write_text(
                    populated_environment().replace(
                        "TRUSTED_PROXY_IPS=192.0.2.10",
                        f"TRUSTED_PROXY_IPS={unsafe_value}",
                    )
                )
                compose_file = temp / "compose.yml"
                compose_file.write_text("services: {}\n")
                result = run_launcher(env_file, compose_file, temp / "missing-docker")

            self.assertNotEqual(result.returncode, 0)
            self.assertIn("only the NPM host", result.stderr)

    def test_container_dependencies_must_not_use_localhost(self) -> None:
        replacements = {
            "DATABASE_URL=postgresql+asyncpg://kelpus:TEST_VALUE_URL_ENCODED_DATABASE_PASSWORD@postgres:5432/kelpus":
                "DATABASE_URL=postgresql+asyncpg://kelpus:password@localhost:5432/kelpus",
            "REDIS_URL=redis://:TEST_VALUE_URL_ENCODED_REDIS_PASSWORD@redis:6379/0":
                "REDIS_URL=redis://:password@localhost:6379/0",
        }
        for valid_line, invalid_line in replacements.items():
            with self.subTest(setting=valid_line.split("=", 1)[0]), tempfile.TemporaryDirectory() as directory:
                temp = Path(directory)
                env_file = temp / ".envserver"
                env_file.write_text(populated_environment().replace(valid_line, invalid_line))
                compose_file = temp / "compose.yml"
                compose_file.write_text("services: {}\n")
                result = run_launcher(env_file, compose_file, temp / "missing-docker")

            self.assertNotEqual(result.returncode, 0)
            self.assertIn("Compose hostname", result.stderr)

    def test_valid_env_runs_non_destructive_command_flow(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            temp = Path(directory)
            env_file = temp / ".envserver"
            env_file.write_text(populated_environment())
            env_file.chmod(stat.S_IRUSR | stat.S_IWUSR)
            compose_file = temp / "compose.yml"
            compose_file.write_text("services: {}\n")
            command_log = temp / "commands.log"
            docker = temp / "docker"
            docker.write_text(
                "#!/usr/bin/env bash\n"
                f"printf 'env=%s args=%s\\n' \"$KELPUS_RUNTIME_ENV_FILE\" \"$*\" >> {command_log!s}\n"
                "exit 0\n"
            )
            docker.chmod(0o700)

            result = run_launcher(env_file, compose_file, docker)
            commands = command_log.read_text()

        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertIn("config --quiet", commands)
        self.assertIn("build backend", commands)
        self.assertIn("up -d postgres redis", commands)
        stop_position = commands.index("stop backend")
        migration_position = commands.index(
            "run --rm --no-deps backend python -m alembic upgrade head"
        )
        backend_start_position = commands.index("up -d backend")
        self.assertLess(stop_position, migration_position)
        self.assertLess(migration_position, backend_start_position)
        self.assertIn(f"env={env_file}", commands)
        self.assertIn("/health", commands)
        self.assertNotIn("app.seed", commands)
        self.assertNotIn("compose down", commands)
        self.assertNotIn("volume rm", commands)
        self.assertNotIn("TEST_VALUE", result.stdout + result.stderr)

    def test_compose_uses_the_same_runtime_env_override(self) -> None:
        compose = (ROOT / "docker-compose.server.yml").read_text()

        self.assertIn("${KELPUS_RUNTIME_ENV_FILE:-./.envserver}", compose)
        self.assertIn("working_dir: /app", compose)
        self.assertIn("PYTHONPATH: /app", compose)


if __name__ == "__main__":
    unittest.main()
