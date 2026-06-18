"""Alembic must import the application from its console entrypoint."""

from __future__ import annotations

import os
from pathlib import Path
import subprocess
import sys
import textwrap
import unittest


BACKEND_DIR = Path(__file__).resolve().parents[1]


class AlembicConfigTests(unittest.TestCase):
    def test_console_entrypoint_prepends_project_root(self) -> None:
        environment = os.environ.copy()
        environment["DATABASE_URL"] = (
            "postgresql+asyncpg://user:password@localhost/kelpus"
        )
        command = textwrap.dedent(
            """
            import os
            import sys

            project_root = os.getcwd()
            sys.path = [entry for entry in sys.path if entry not in ('', project_root)]

            from alembic.config import main
            main(argv=['upgrade', 'head', '--sql'])
            """
        )

        result = subprocess.run(
            [sys.executable, "-c", command],
            cwd=BACKEND_DIR,
            env=environment,
            text=True,
            capture_output=True,
            check=False,
        )

        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertIn("CREATE TABLE alembic_version", result.stdout)


if __name__ == "__main__":
    unittest.main()
