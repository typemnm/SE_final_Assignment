import json
import unittest
from pathlib import Path

from pydantic import ValidationError

from app.domains.health.schemas import (
    FALLBACK_KEY_POLICY,
    HealthConnectHeartRateRecord,
    HealthConnectSyncContract,
    HealthConnectSyncEnvelope,
    HealthConnectSyncResponse,
)

ROOT = Path(__file__).resolve().parents[2]
CONTRACT_DIR = ROOT / "contracts" / "health-connect"


def load_contract(name):
    with (CONTRACT_DIR / name).open(encoding="utf-8") as fh:
        return json.load(fh)


class HealthSyncContractTest(unittest.TestCase):
    def test_success_request_matches_typed_contract(self):
        payload = load_contract("success-request.json")

        typed = HealthConnectSyncContract.model_validate(payload)

        self.assertEqual(typed.platform, "health_connect")
        self.assertEqual(len(typed.running), 1)
        self.assertEqual(typed.running[0].avg_pace, 5.77)
        self.assertFalse(hasattr(typed.running[0], "speed_samples"))
        self.assertEqual(typed.daily_activity[0].steps, 9300)
        self.assertEqual(typed.heart_rate[0].samples[0].bpm, 132)

    def test_top_level_envelope_accepts_raw_items_for_service_level_validation(self):
        payload = load_contract("success-request.json")
        payload["heartRate"][0]["samples"][0]["bpm"] = -1

        envelope = HealthConnectSyncEnvelope.model_validate(payload)

        self.assertEqual(envelope.platform, "health_connect")
        self.assertEqual(envelope.heart_rate[0]["samples"][0]["bpm"], -1)
        with self.assertRaises(ValidationError):
            HealthConnectHeartRateRecord.model_validate(envelope.heart_rate[0])

    def test_invalid_envelope_fails_before_service_processing(self):
        payload = load_contract("success-request.json")
        payload["running"] = {"not": "an array"}

        with self.assertRaises(ValidationError):
            HealthConnectSyncEnvelope.model_validate(payload)

    def test_response_fixtures_cover_partial_success_and_failed_counts(self):
        partial = HealthConnectSyncResponse.model_validate(
            load_contract("partial-success-response.json")
        )
        failed = HealthConnectSyncResponse.model_validate(
            load_contract("failed-counts-response.json")
        )

        self.assertEqual(partial.status, "partial_success")
        self.assertEqual(partial.total.created, 3)
        self.assertEqual(partial.groups["heartRate"].failed, 1)
        self.assertEqual(failed.status, "failed")
        self.assertEqual(failed.total.failed, 4)

    def test_fallback_key_policy_documents_speed_as_derivation_only(self):
        self.assertIn("metadata.id", FALLBACK_KEY_POLICY["primary"])
        self.assertIn("record_type", FALLBACK_KEY_POLICY["fallback"])
        self.assertIn("derivation", FALLBACK_KEY_POLICY["speed"])


if __name__ == "__main__":
    unittest.main()
