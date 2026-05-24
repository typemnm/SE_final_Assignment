"""
AI 분석 서비스 어댑터.
식단 이미지 분석 및 맞춤형 식단 추천 기능을 제공한다.
다이어그램의 AI_분석_서비스(Service)에 해당한다.
"""

import logging

import httpx

from app.config import settings

logger = logging.getLogger(__name__)


class AIAnalyzerService:
    """
    AI 분석 서비스.

    식단_이미지_분석(이미지_URL), 맞춤형_식단_추천(사용자_정보) 메서드를 제공한다.
    실제 환경에서는 OpenAI Vision API 또는 자체 AI 서버와 연동한다.
    """

    def __init__(self) -> None:
        """AIAnalyzerService 초기화."""
        self._api_key = settings.AI_ANALYSIS_API_KEY
        self._base_url = settings.AI_ANALYSIS_BASE_URL

    async def analyze_image(self, image_url: str) -> dict:
        """
        식단 이미지를 분석하여 영양소 정보와 AI 코멘트를 반환한다 (식단_이미지_분석).

        실제 환경에서는 Vision API에 이미지 URL을 전송하고 응답을 파싱한다.
        현재는 mock 응답을 반환한다.

        Args:
            image_url: 분석할 식단 이미지 URL.

        Returns:
            분석 결과 딕셔너리:
            {
                "total_calories": float,
                "carb_ratio": float,
                "protein_ratio": float,
                "fat_ratio": float,
                "ai_comment": str,
            }
        """
        logger.info("AI 이미지 분석 시작: %s", image_url)

        # TODO: 실제 AI Vision API 연동
        # async with httpx.AsyncClient() as client:
        #     response = await client.post(
        #         f"{self._base_url}/chat/completions",
        #         headers={"Authorization": f"Bearer {self._api_key}"},
        #         json={
        #             "model": "gpt-4o",
        #             "messages": [{"role": "user", "content": [...]}],
        #         },
        #     )
        #     return self._parse_response(response.json())

        # Mock 응답 (구조 검증용)
        return {
            "total_calories": 650.0,
            "carb_ratio": 55.0,
            "protein_ratio": 25.0,
            "fat_ratio": 20.0,
            "ai_comment": (
                "균형 잡힌 식단입니다. 탄수화물 비율이 적절하며 단백질 섭취량이 좋습니다. "
                "채소류를 더 추가하면 식이섬유 보충에 도움이 됩니다."
            ),
        }

    async def recommend_diet(self, user_info: dict) -> dict:
        """
        사용자 정보를 기반으로 맞춤형 식단을 추천한다 (맞춤형_식단_추천).

        Args:
            user_info: 사용자 정보 딕셔너리 (age, gender, health_goal 등).

        Returns:
            맞춤형 식단 추천 딕셔너리.
        """
        logger.info("맞춤형 식단 추천 생성: user_id=%s", user_info.get("user_id"))

        # TODO: 실제 AI 추천 서비스 연동
        return {
            "recommended_calories": 2000,
            "meal_plan": {
                "breakfast": "오트밀과 신선한 과일",
                "lunch": "현미밥, 닭가슴살, 채소 샐러드",
                "dinner": "잡곡밥, 생선구이, 나물반찬",
                "snacks": ["견과류 30g", "그릭 요거트"],
            },
            "nutrition_targets": {
                "carbohydrates_g": 250,
                "protein_g": 100,
                "fat_g": 65,
            },
            "tips": [
                "식사 전 물 한 잔으로 과식을 방지하세요.",
                "규칙적인 식사 시간을 지키세요.",
            ],
        }
