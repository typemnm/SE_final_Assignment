"""
AI 분석 서비스 어댑터.
식단 이미지 분석 및 맞춤형 식단 추천 기능을 제공한다.
다이어그램의 AI_분석_서비스(Service)에 해당한다.
"""

from __future__ import annotations

import base64
import asyncio
import http.client
import ipaddress
import json
import logging
import math
import socket
import ssl
from collections.abc import Awaitable, Callable
from dataclasses import dataclass
from typing import Any
from urllib.parse import urlparse, urlunparse

import httpx

from app.config import Settings, settings

logger = logging.getLogger(__name__)

SUPPORTED_IMAGE_MIME_TYPES = {
    "image/png",
    "image/jpeg",
    "image/webp",
    "image/heic",
    "image/heif",
}
PLACEHOLDER_API_KEYS = {
    "",
    "dummy-key",
    "your-ai-api-key",
    "your-gemini-api-key",
    "your-gemini-api-key-here",
    "change-me",
}
BLOCKED_HOSTNAMES = {
    "localhost",
    "metadata.google.internal",
}


@dataclass(slots=True)
class AIAnalysisError(Exception):
    """AI 분석 실패를 서비스 계층에서 HTTP 오류로 매핑하기 위한 typed error."""

    status_code: int
    detail: str

    def __str__(self) -> str:
        return self.detail


@dataclass(frozen=True, slots=True)
class _DownloadedImage:
    """Gemini inline data로 전송할 이미지 바이트와 MIME 타입."""

    mime_type: str
    data: bytes


@dataclass(frozen=True, slots=True)
class _ValidatedImageURL:
    """DNS 검증 결과와 실제 연결 대상을 묶어 TOCTOU를 방지한다."""

    hostname: str
    port: int
    connect_ip: str
    request_target: str


class _BoundHTTPSConnection(http.client.HTTPSConnection):
    """검증된 IP로 연결하되 TLS SNI/Host는 원본 호스트를 유지한다."""

    def __init__(
        self,
        host: str,
        port: int,
        connect_ip: str,
        timeout: float,
        context: ssl.SSLContext,
    ) -> None:
        super().__init__(host=host, port=port, timeout=timeout, context=context)
        self._connect_ip = connect_ip

    def connect(self) -> None:
        self.sock = socket.create_connection(
            (self._connect_ip, self.port),
            self.timeout,
            self.source_address,
        )
        self.sock = self._context.wrap_socket(self.sock, server_hostname=self.host)


class AIAnalyzerService:
    """
    AI 분석 서비스.

    식단_이미지_분석(이미지_URL), 맞춤형_식단_추천(사용자_정보) 메서드를 제공한다.
    Gemini REST API를 통해 식단 이미지를 분석한다.
    """

    def __init__(
        self,
        config: Settings | None = None,
        client_factory: Callable[[], httpx.AsyncClient] | None = None,
        resolver: Callable[[str], list[str]] | None = None,
        image_fetcher: Callable[
            [_ValidatedImageURL], _DownloadedImage | Awaitable[_DownloadedImage]
        ]
        | None = None,
    ) -> None:
        """AIAnalyzerService 초기화.

        Args:
            config: 테스트 주입을 위한 Settings 객체. 기본값은 앱 전역 settings.
            client_factory: 테스트 주입을 위한 Gemini httpx AsyncClient factory.
            resolver: 테스트 주입을 위한 hostname → IP resolver.
            image_fetcher: 테스트 주입을 위한 검증 완료 이미지 다운로드 함수.
        """
        self._settings = config or settings
        self._client_factory = client_factory
        self._resolver = resolver or self._resolve_host_ips
        self._image_fetcher = image_fetcher

    async def analyze_image(self, image_url: str) -> dict[str, float | str]:
        """
        식단 이미지를 분석하여 영양소 정보와 AI 코멘트를 반환한다 (식단_이미지_분석).

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

        Raises:
            AIAnalysisError: 설정, 이미지 다운로드, Gemini 호출, 응답 파싱/검증 실패 시.
        """
        logger.info("AI 이미지 분석 시작: %s", self._redact_url(image_url))
        self._ensure_configured()
        validated_url = self._validate_image_url(image_url)

        async with self._create_client() as client:
            image = await self._fetch_image(validated_url)
            payload = self._build_gemini_payload(image)
            response_data = await self._post_to_gemini(client, payload)

        raw_analysis = self._parse_gemini_response(response_data)
        return self._validate_analysis(raw_analysis)

    def _create_client(self) -> httpx.AsyncClient:
        if self._client_factory is not None:
            return self._client_factory()
        return httpx.AsyncClient(timeout=self._settings.GEMINI_REQUEST_TIMEOUT_SECONDS)

    def _ensure_configured(self) -> None:
        api_key = (self._settings.GEMINI_API_KEY or "").strip()
        if api_key.lower() in PLACEHOLDER_API_KEYS:
            raise AIAnalysisError(
                status_code=503,
                detail="Gemini API 키가 설정되지 않았습니다.",
            )
        if not self._settings.GEMINI_MODEL.strip():
            raise AIAnalysisError(
                status_code=503,
                detail="Gemini 모델 설정이 비어 있습니다.",
            )
        if not self._settings.GEMINI_API_BASE_URL.strip():
            raise AIAnalysisError(
                status_code=503,
                detail="Gemini API Base URL 설정이 비어 있습니다.",
            )

    def _validate_image_url(self, image_url: str) -> _ValidatedImageURL:
        parsed = urlparse(image_url)
        hostname = parsed.hostname
        if parsed.scheme != "https" or not hostname:
            raise AIAnalysisError(
                status_code=422,
                detail="식단 이미지 URL은 HTTPS URL이어야 합니다.",
            )
        if parsed.username or parsed.password:
            raise AIAnalysisError(
                status_code=422,
                detail="식단 이미지 URL에 인증 정보를 포함할 수 없습니다.",
            )

        try:
            port = parsed.port or 443
        except ValueError as exc:
            raise AIAnalysisError(
                status_code=422,
                detail="식단 이미지 URL 포트가 올바르지 않습니다.",
            ) from exc

        lowered_host = hostname.rstrip(".").lower()
        if lowered_host in BLOCKED_HOSTNAMES or lowered_host.endswith(".localhost"):
            raise AIAnalysisError(
                status_code=422,
                detail="허용되지 않는 이미지 URL 호스트입니다.",
            )

        try:
            ip_addresses = [str(ipaddress.ip_address(lowered_host))]
        except ValueError:
            try:
                ip_addresses = self._resolver(lowered_host)
            except OSError as exc:
                raise AIAnalysisError(
                    status_code=422,
                    detail="식단 이미지 URL 호스트를 확인할 수 없습니다.",
                ) from exc

        if not ip_addresses or any(self._is_blocked_ip(ip) for ip in ip_addresses):
            raise AIAnalysisError(
                status_code=422,
                detail="내부 네트워크 이미지 URL은 사용할 수 없습니다.",
            )

        request_target = urlunparse((
            "",
            "",
            parsed.path or "/",
            parsed.params,
            parsed.query,
            "",
        ))
        return _ValidatedImageURL(
            hostname=lowered_host,
            port=port,
            connect_ip=self._select_connect_ip(ip_addresses),
            request_target=request_target,
        )

    def _resolve_host_ips(self, hostname: str) -> list[str]:
        return list({
            result[4][0]
            for result in socket.getaddrinfo(hostname, None, type=socket.SOCK_STREAM)
        })

    def _is_blocked_ip(self, value: str) -> bool:
        ip = ipaddress.ip_address(value)
        return (
            not ip.is_global
            or ip.is_private
            or ip.is_loopback
            or ip.is_link_local
            or ip.is_multicast
            or ip.is_reserved
            or ip.is_unspecified
        )

    def _select_connect_ip(self, values: list[str]) -> str:
        """검증된 공인 IP 중 IPv4를 우선 선택해 IPv6-only 실패를 줄인다."""

        return str(sorted(
            (ipaddress.ip_address(value) for value in values),
            key=lambda ip: (ip.version != 4, str(ip)),
        )[0])

    def _redact_url(self, image_url: str) -> str:
        parsed = urlparse(image_url)
        hostname = parsed.hostname
        if not parsed.scheme or not hostname:
            return "<invalid-url>"
        netloc = hostname
        try:
            port = parsed.port
        except ValueError:
            port = None
        if port is not None:
            netloc = f"{netloc}:{port}"
        return urlunparse((parsed.scheme, netloc, "", "", "", ""))

    async def _fetch_image(self, validated_url: _ValidatedImageURL) -> _DownloadedImage:
        if self._image_fetcher is not None:
            result = self._image_fetcher(validated_url)
            if isinstance(result, Awaitable):
                return await result
            return result

        try:
            return await asyncio.to_thread(self._fetch_image_sync, validated_url)
        except AIAnalysisError:
            raise
        except (OSError, TimeoutError, http.client.HTTPException, ssl.SSLError) as exc:
            logger.warning("식단 이미지 다운로드 실패: %s", exc.__class__.__name__)
            raise AIAnalysisError(
                status_code=422,
                detail="식단 이미지 URL을 다운로드할 수 없습니다.",
            ) from exc

    def _fetch_image_sync(self, validated_url: _ValidatedImageURL) -> _DownloadedImage:
        context = ssl.create_default_context()
        connection = _BoundHTTPSConnection(
            host=validated_url.hostname,
            port=validated_url.port,
            connect_ip=validated_url.connect_ip,
            timeout=self._settings.GEMINI_REQUEST_TIMEOUT_SECONDS,
            context=context,
        )
        try:
            connection.request(
                "GET",
                validated_url.request_target,
                headers={"Accept": ", ".join(sorted(SUPPORTED_IMAGE_MIME_TYPES))},
            )
            response = connection.getresponse()
            return self._read_image_response(response)
        finally:
            connection.close()

    def _read_image_response(self, response: http.client.HTTPResponse) -> _DownloadedImage:
        image_bytes = bytearray()
        if 300 <= response.status < 400:
            raise AIAnalysisError(
                status_code=422,
                detail="식단 이미지 URL 리다이렉트는 허용되지 않습니다.",
            )
        if response.status < 200 or response.status >= 300:
            raise AIAnalysisError(
                status_code=422,
                detail="식단 이미지 URL이 성공 응답을 반환하지 않았습니다.",
            )

        mime_type = (
            (response.getheader("content-type") or "")
            .split(";", maxsplit=1)[0]
            .strip()
            .lower()
        )
        if mime_type not in SUPPORTED_IMAGE_MIME_TYPES:
            raise AIAnalysisError(
                status_code=422,
                detail=(
                    "지원하지 않는 이미지 형식입니다. "
                    "PNG, JPEG, WEBP, HEIC, HEIF만 지원합니다."
                ),
            )

        content_length = response.getheader("content-length")
        if content_length is not None:
            try:
                if int(content_length) > self._settings.GEMINI_IMAGE_MAX_BYTES:
                    raise AIAnalysisError(
                        status_code=422,
                        detail="이미지 파일 크기가 허용 한도를 초과했습니다.",
                    )
            except ValueError:
                logger.warning("이미지 Content-Length 헤더를 해석할 수 없습니다.")

        chunk_size = 64 * 1024
        while True:
            chunk = response.read(chunk_size)
            if not chunk:
                break
            if len(image_bytes) + len(chunk) > self._settings.GEMINI_IMAGE_MAX_BYTES:
                raise AIAnalysisError(
                    status_code=422,
                    detail="이미지 파일 크기가 허용 한도를 초과했습니다.",
                )
            image_bytes.extend(chunk)

        if not image_bytes:
            raise AIAnalysisError(
                status_code=422,
                detail="이미지 파일이 비어 있습니다.",
            )

        return _DownloadedImage(mime_type=mime_type, data=bytes(image_bytes))

    def _build_gemini_payload(self, image: _DownloadedImage) -> dict[str, Any]:
        encoded_image = base64.b64encode(image.data).decode("ascii")
        return {
            "contents": [
                {
                    "parts": [
                        {
                            "text": (
                                "식단 이미지를 분석해 총 칼로리와 탄수화물/단백질/지방 비율을 추정하세요. "
                                "결과는 JSON 스키마에 맞춰 한국어 코멘트와 함께 반환하세요. "
                                "비율은 전체 100% 기준의 숫자여야 합니다."
                            )
                        },
                        {
                            "inline_data": {
                                "mime_type": image.mime_type,
                                "data": encoded_image,
                            }
                        },
                    ]
                }
            ],
            "generationConfig": {
                "responseMimeType": "application/json",
                "responseJsonSchema": {
                    "type": "object",
                    "properties": {
                        "total_calories": {
                            "type": "number",
                            "description": "Estimated total calories in kcal.",
                        },
                        "carb_ratio": {
                            "type": "number",
                            "description": "Estimated carbohydrate percentage from 0 to 100.",
                        },
                        "protein_ratio": {
                            "type": "number",
                            "description": "Estimated protein percentage from 0 to 100.",
                        },
                        "fat_ratio": {
                            "type": "number",
                            "description": "Estimated fat percentage from 0 to 100.",
                        },
                        "ai_comment": {
                            "type": "string",
                            "description": "Short Korean nutrition comment for the user.",
                        },
                    },
                    "required": [
                        "total_calories",
                        "carb_ratio",
                        "protein_ratio",
                        "fat_ratio",
                        "ai_comment",
                    ],
                },
            },
        }

    async def _post_to_gemini(
        self, client: httpx.AsyncClient, payload: dict[str, Any]
    ) -> dict[str, Any]:
        base_url = self._settings.GEMINI_API_BASE_URL.rstrip("/")
        model = self._settings.GEMINI_MODEL.strip()
        url = f"{base_url}/models/{model}:generateContent"

        try:
            response = await client.post(
                url,
                headers={
                    "x-goog-api-key": self._settings.GEMINI_API_KEY.strip(),
                    "Content-Type": "application/json",
                },
                json=payload,
            )
        except httpx.TimeoutException as exc:
            logger.warning("Gemini API 요청 타임아웃")
            raise AIAnalysisError(
                status_code=504,
                detail="Gemini API 요청 시간이 초과되었습니다.",
            ) from exc
        except httpx.RequestError as exc:
            logger.warning("Gemini API 요청 실패: %s", exc.__class__.__name__)
            raise AIAnalysisError(status_code=502, detail="Gemini API 요청에 실패했습니다.") from exc

        if response.status_code < 200 or response.status_code >= 300:
            logger.warning("Gemini API 오류 응답: status=%s", response.status_code)
            raise AIAnalysisError(
                status_code=502,
                detail="Gemini API가 오류 응답을 반환했습니다.",
            )

        try:
            return response.json()
        except json.JSONDecodeError as exc:
            raise AIAnalysisError(
                status_code=502,
                detail="Gemini API 응답을 JSON으로 해석할 수 없습니다.",
            ) from exc

    def _parse_gemini_response(self, response_data: dict[str, Any]) -> dict[str, Any]:
        candidates = response_data.get("candidates")
        if not isinstance(candidates, list) or not candidates:
            raise AIAnalysisError(
                status_code=502,
                detail="Gemini API 응답에 분석 후보가 없습니다.",
            )

        parts = candidates[0].get("content", {}).get("parts", [])
        if not isinstance(parts, list) or not parts:
            raise AIAnalysisError(
                status_code=502,
                detail="Gemini API 응답에 분석 결과가 없습니다.",
            )

        text = next(
            (part.get("text") for part in parts if isinstance(part, dict) and part.get("text")),
            None,
        )
        if not isinstance(text, str):
            raise AIAnalysisError(
                status_code=502,
                detail="Gemini API 응답에 텍스트 분석 결과가 없습니다.",
            )

        try:
            parsed = json.loads(text)
        except (json.JSONDecodeError, ValueError) as exc:
            raise AIAnalysisError(
                status_code=502,
                detail="Gemini 분석 결과 JSON 파싱에 실패했습니다.",
            ) from exc

        if not isinstance(parsed, dict):
            raise AIAnalysisError(
                status_code=502,
                detail="Gemini 분석 결과 형식이 올바르지 않습니다.",
            )
        return parsed

    def _validate_analysis(self, analysis: dict[str, Any]) -> dict[str, float | str]:
        required_fields = [
            "total_calories",
            "carb_ratio",
            "protein_ratio",
            "fat_ratio",
            "ai_comment",
        ]
        missing = [field for field in required_fields if field not in analysis]
        if missing:
            raise AIAnalysisError(
                status_code=502,
                detail="Gemini 분석 결과에 필수 영양소 필드가 누락되었습니다.",
            )

        total_calories = self._coerce_number(analysis["total_calories"], "총 칼로리")
        carb_ratio = self._coerce_number(analysis["carb_ratio"], "탄수화물 비율")
        protein_ratio = self._coerce_number(analysis["protein_ratio"], "단백질 비율")
        fat_ratio = self._coerce_number(analysis["fat_ratio"], "지방 비율")
        ai_comment = analysis["ai_comment"]

        if total_calories < 0:
            raise AIAnalysisError(
                status_code=502,
                detail="Gemini 분석 결과의 칼로리 값이 올바르지 않습니다.",
            )
        ratios = [carb_ratio, protein_ratio, fat_ratio]
        if any(ratio < 0 or ratio > 100 for ratio in ratios):
            raise AIAnalysisError(
                status_code=502,
                detail="Gemini 분석 결과의 탄단지 비율 범위가 올바르지 않습니다.",
            )
        if abs(sum(ratios) - 100.0) > 5.0:
            raise AIAnalysisError(
                status_code=502,
                detail="Gemini 분석 결과의 탄단지 비율 합계가 올바르지 않습니다.",
            )
        if not isinstance(ai_comment, str) or not ai_comment.strip():
            raise AIAnalysisError(
                status_code=502,
                detail="Gemini 분석 코멘트가 비어 있습니다.",
            )

        return {
            "total_calories": float(total_calories),
            "carb_ratio": float(carb_ratio),
            "protein_ratio": float(protein_ratio),
            "fat_ratio": float(fat_ratio),
            "ai_comment": ai_comment.strip(),
        }

    def _coerce_number(self, value: Any, label: str) -> float:
        if isinstance(value, bool):
            raise AIAnalysisError(
                status_code=502,
                detail=f"Gemini 분석 결과의 {label} 값이 숫자가 아닙니다.",
            )
        try:
            number = float(value)
        except (TypeError, ValueError) as exc:
            raise AIAnalysisError(
                status_code=502,
                detail=f"Gemini 분석 결과의 {label} 값이 숫자가 아닙니다.",
            ) from exc
        if not math.isfinite(number):
            raise AIAnalysisError(
                status_code=502,
                detail=f"Gemini 분석 결과의 {label} 값이 유한한 숫자가 아닙니다.",
            )
        return number

    async def recommend_diet(self, user_info: dict) -> dict:
        """
        사용자 정보를 기반으로 맞춤형 식단을 추천한다 (맞춤형_식단_추천).

        Args:
            user_info: 사용자 정보 딕셔너리 (age, gender, health_goal 등).

        Returns:
            맞춤형 식단 추천 딕셔너리.
        """
        logger.info("맞춤형 식단 추천 생성: user_id=%s", user_info.get("user_id"))

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
