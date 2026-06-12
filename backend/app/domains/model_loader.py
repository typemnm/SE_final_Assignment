"""Central model import hook for SQLAlchemy metadata registration."""


def import_all_models() -> None:
    """Import ORM modules that must be present before Base.metadata.create_all."""

    # Existing domain models
    import app.domains.diet.models  # noqa: F401
    import app.domains.running.models  # noqa: F401
    import app.domains.sns.models  # noqa: F401
    import app.domains.user.models  # noqa: F401

    # Health Connect MVP telemetry models
    import app.domains.health.models  # noqa: F401
