import asyncio
import unittest
import uuid
from datetime import datetime, timezone
from types import SimpleNamespace
from unittest.mock import patch

from fastapi import HTTPException

from app.domains.diet import service
from app.domains.diet.schemas import DietAnalyzeRequest
from app.infrastructure.adapters.ai_analyzer import AIAnalysisError


def run(coro):
    return asyncio.run(coro)


_DEFAULT_RECORD = object()


class FakePlan:
    def __init__(self, order):
        self.order = order
        self.usage_updated = False

    def check_remaining_count(self):
        self.order.append("check_remaining")
        return True

    def update_usage(self):
        self.order.append("update_usage")
        self.usage_updated = True


class FakePlanRepo:
    def __init__(self, plan):
        self.plan = plan

    async def get_by_user_id(self, user_id, db):
        self.plan.order.append("get_plan")
        return self.plan


class FakeDietRecordRepo:
    def __init__(self, record, order):
        self.record = record
        self.order = order

    async def create_with_image(self, user_id, image_url, db):
        self.order.append("create_record")
        return self.record

    async def get_by_id(self, record_id, db):
        self.order.append("get_record")
        return self.record

    async def get_by_id_for_user(self, record_id, user_id, db):
        self.order.append("get_record_for_user")
        return self.record


class FakeAnalysisRepo:
    def __init__(self, result, order):
        self.result = result
        self.order = order
        self.saved = False

    async def save_analysis(self, user_id, diet_record_id, analysis_data, db):
        self.order.append("save_analysis")
        self.saved = True
        self.result.total_calories = analysis_data["total_calories"]
        self.result.carb_ratio = analysis_data["carb_ratio"]
        self.result.protein_ratio = analysis_data["protein_ratio"]
        self.result.fat_ratio = analysis_data["fat_ratio"]
        self.result.ai_comment = analysis_data["ai_comment"]
        return self.result


class FakeAnalyzer:
    def __init__(self, order, response=None, error=None):
        self.order = order
        self.response = response
        self.error = error

    async def analyze_image(self, image_url):
        self.order.append("analyze_image")
        if self.error:
            raise self.error
        return self.response


class FakeDb:
    def __init__(self, order):
        self.order = order

    async def rollback(self):
        self.order.append("rollback")

    async def flush(self):
        self.order.append("flush")


def make_record(record_id):
    return SimpleNamespace(id=record_id)


def make_result(record_id):
    result = SimpleNamespace(
        id=uuid.uuid4(),
        diet_record_id=record_id,
        total_calories=0,
        carb_ratio=0,
        protein_ratio=0,
        fat_ratio=0,
        ai_comment=None,
        analyzed_at=datetime.now(timezone.utc),
    )
    result.get_visualization_data = lambda: {"analysis_id": str(result.id)}
    return result


class DietServiceAIErrorTest(unittest.TestCase):
    def patch_service(self, analyzer, record=_DEFAULT_RECORD):
        order = analyzer.order
        record_id = uuid.uuid4()
        if record is _DEFAULT_RECORD:
            record = make_record(record_id)
        plan = FakePlan(order)
        analysis_repo = FakeAnalysisRepo(make_result(record_id), order)
        patches = [
            patch.object(service, "_plan_repo", FakePlanRepo(plan)),
            patch.object(service, "_diet_record_repo", FakeDietRecordRepo(record, order)),
            patch.object(service, "_analysis_repo", analysis_repo),
            patch.object(service, "_ai_analyzer", analyzer),
        ]
        return patches, plan, analysis_repo

    def test_analyzer_error_does_not_save_or_increment_usage(self):
        order = []
        analyzer = FakeAnalyzer(order, error=AIAnalysisError(502, "Gemini 실패"))
        patches, plan, analysis_repo = self.patch_service(analyzer)
        for p in patches:
            p.start()
        self.addCleanup(lambda: [p.stop() for p in reversed(patches)])

        with self.assertRaises(HTTPException) as ctx:
            run(
                service.analyze_diet(
                    str(uuid.uuid4()),
                    DietAnalyzeRequest(image_url="https://cdn.example.com/meal.jpg"),
                    FakeDb(order),
                )
            )

        self.assertEqual(ctx.exception.status_code, 502)
        self.assertFalse(analysis_repo.saved)
        self.assertFalse(plan.usage_updated)
        self.assertEqual(order, ["get_plan", "check_remaining", "rollback", "analyze_image"])

    def test_foreign_diet_record_id_does_not_call_analyzer_save_or_increment_usage(self):
        order = []
        analyzer = FakeAnalyzer(
            order,
            response={
                "total_calories": 510.0,
                "carb_ratio": 45.0,
                "protein_ratio": 30.0,
                "fat_ratio": 25.0,
                "ai_comment": "호출되면 안 됩니다.",
            },
        )
        patches, plan, analysis_repo = self.patch_service(analyzer, record=None)
        for p in patches:
            p.start()
        self.addCleanup(lambda: [p.stop() for p in reversed(patches)])

        with self.assertRaises(HTTPException) as ctx:
            run(
                service.analyze_diet(
                    str(uuid.uuid4()),
                    DietAnalyzeRequest(
                        image_url="https://cdn.example.com/meal.jpg",
                        diet_record_id=uuid.uuid4(),
                    ),
                    FakeDb(order),
                )
            )

        self.assertEqual(ctx.exception.status_code, 404)
        self.assertFalse(analysis_repo.saved)
        self.assertFalse(plan.usage_updated)
        self.assertNotIn("analyze_image", order)
        self.assertEqual(order, ["get_plan", "check_remaining", "get_record_for_user"])

    def test_success_saves_before_usage_increment(self):
        order = []
        analyzer = FakeAnalyzer(
            order,
            response={
                "total_calories": 510.0,
                "carb_ratio": 45.0,
                "protein_ratio": 30.0,
                "fat_ratio": 25.0,
                "ai_comment": "단백질이 충분한 식단입니다.",
            },
        )
        patches, plan, analysis_repo = self.patch_service(analyzer)
        for p in patches:
            p.start()
        self.addCleanup(lambda: [p.stop() for p in reversed(patches)])

        response = run(
            service.analyze_diet(
                str(uuid.uuid4()),
                DietAnalyzeRequest(image_url="https://cdn.example.com/meal.jpg"),
                FakeDb(order),
            )
        )

        self.assertEqual(response.total_calories, 510.0)
        self.assertTrue(analysis_repo.saved)
        self.assertTrue(plan.usage_updated)
        self.assertEqual(
            order,
            [
                "get_plan",
                "check_remaining",
                "rollback",
                "analyze_image",
                "get_plan",
                "check_remaining",
                "create_record",
                "save_analysis",
                "update_usage",
                "flush",
            ],
        )


if __name__ == "__main__":
    unittest.main()
