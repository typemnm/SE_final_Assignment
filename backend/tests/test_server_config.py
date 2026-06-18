"""Production-facing server configuration regressions."""

import asyncio
import unittest
from unittest.mock import AsyncMock, patch

from fastapi.middleware.cors import CORSMiddleware

from app.config import Settings
from app.main import create_app


class ServerConfigTests(unittest.TestCase):
    def test_cors_origins_are_parsed_from_csv(self) -> None:
        config = Settings(
            CORS_ALLOWED_ORIGINS=(
                "https://1mnhomenetwork.iptime.org:30001, https://admin.example"
            )
        )

        self.assertEqual(
            config.cors_allowed_origins,
            [
                "https://1mnhomenetwork.iptime.org:30001",
                "https://admin.example",
            ],
        )
        self.assertTrue(config.cors_allow_credentials)

    def test_wildcard_cors_disables_credentials(self) -> None:
        config = Settings(CORS_ALLOWED_ORIGINS="*")

        self.assertEqual(config.cors_allowed_origins, ["*"])
        self.assertFalse(config.cors_allow_credentials)

    def test_table_auto_creation_can_be_disabled_for_alembic(self) -> None:
        config = Settings(AUTO_CREATE_TABLES=False)

        self.assertFalse(config.AUTO_CREATE_TABLES)

    def test_production_lifespan_leaves_schema_changes_to_alembic(self) -> None:
        application = create_app(Settings(AUTO_CREATE_TABLES=False))

        async def exercise_lifespan() -> None:
            with patch("app.main.create_tables", new_callable=AsyncMock) as create_tables:
                async with application.router.lifespan_context(application):
                    pass
                create_tables.assert_not_awaited()

        asyncio.run(exercise_lifespan())

    def test_application_uses_configured_cors_policy(self) -> None:
        config = Settings(CORS_ALLOWED_ORIGINS="https://example.test")
        app = create_app(config)
        cors = next(
            middleware
            for middleware in app.user_middleware
            if middleware.cls is CORSMiddleware
        )

        self.assertEqual(cors.kwargs["allow_origins"], ["https://example.test"])
        self.assertTrue(cors.kwargs["allow_credentials"])


if __name__ == "__main__":
    unittest.main()
