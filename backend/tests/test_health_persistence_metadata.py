import unittest

from app.database import Base
from app.domains.model_loader import import_all_models
from app.domains.diet.models import (
    DataSourceEnum,
    DietRecord,
    HealthConnectExportStatusEnum,
)
from app.domains.health.models import HealthDailyActivityRecord, HealthHeartRateRecord


class HealthPersistenceMetadataTest(unittest.TestCase):
    def setUp(self):
        import_all_models()

    def test_diet_record_has_health_connect_source_and_external_id(self):
        self.assertEqual(DataSourceEnum.health_connect.value, "health_connect")
        columns = Base.metadata.tables["diet_records"].c
        self.assertIn("external_id", columns)
        self.assertTrue(columns["external_id"].index)

        record = DietRecord().map_health_connect_nutrition(
            {"calories": 650, "carbs": 80, "protein": 30, "fat": 20},
            external_id="hc-nutrition-1",
        )

        self.assertEqual(record.external_id, "hc-nutrition-1")
        self.assertEqual(record.data_source, DataSourceEnum.health_connect)
        self.assertEqual(record.nutrition_data["source"], "health_connect")

    def test_diet_record_has_outbound_health_connect_export_metadata(self):
        columns = Base.metadata.tables["diet_records"].c

        self.assertIn("health_connect_client_record_id", columns)
        self.assertTrue(columns["health_connect_client_record_id"].index)
        self.assertIn("health_connect_record_id", columns)
        self.assertIn("health_connect_record_version", columns)
        self.assertIn("health_connect_export_status", columns)
        self.assertFalse(columns["health_connect_export_status"].nullable)
        self.assertIn("health_connect_exported_at", columns)
        self.assertIn("health_connect_last_error", columns)

        record = DietRecord().map_health_connect_nutrition(
            {"calories": 650},
            external_id="inbound-hc-nutrition-1",
        )
        record.health_connect_client_record_id = "kelpus:diet:record-1"
        record.health_connect_record_id = "device-local-record-id"
        record.health_connect_record_version = 1
        record.health_connect_export_status = HealthConnectExportStatusEnum.exported

        self.assertEqual(record.external_id, "inbound-hc-nutrition-1")
        self.assertEqual(
            record.health_connect_export_status,
            HealthConnectExportStatusEnum.exported,
        )

    def test_health_connect_tables_are_registered_in_base_metadata(self):
        tables = Base.metadata.tables

        self.assertIn("health_daily_activity_records", tables)
        self.assertIn("health_heart_rate_records", tables)

        daily_columns = tables["health_daily_activity_records"].c
        self.assertIn("external_id", daily_columns)
        self.assertFalse(daily_columns["external_id"].nullable)
        self.assertIn("activity_date", daily_columns)
        self.assertIn("steps", daily_columns)
        self.assertIn("active_calories", daily_columns)
        self.assertIn("total_calories", daily_columns)

        heart_columns = tables["health_heart_rate_records"].c
        self.assertIn("external_id", heart_columns)
        self.assertFalse(heart_columns["external_id"].nullable)
        self.assertIn("start_time", heart_columns)
        self.assertIn("end_time", heart_columns)
        self.assertIn("samples", heart_columns)

    def test_health_model_unique_constraints_are_user_scoped(self):
        daily_constraints = {
            constraint.name
            for constraint in HealthDailyActivityRecord.__table__.constraints
        }
        heart_constraints = {
            constraint.name
            for constraint in HealthHeartRateRecord.__table__.constraints
        }
        diet_constraints = {constraint.name for constraint in DietRecord.__table__.constraints}

        self.assertIn("uq_health_daily_activity_user_external_id", daily_constraints)
        self.assertIn("uq_health_heart_rate_user_external_id", heart_constraints)
        self.assertIn("uq_diet_records_user_source_external_id", diet_constraints)


if __name__ == "__main__":
    unittest.main()
