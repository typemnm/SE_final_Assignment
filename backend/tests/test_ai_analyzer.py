import asyncio
import json
import unittest

import httpx

from app.config import Settings
from app.infrastructure.adapters import ai_analyzer as ai_module
from app.infrastructure.adapters.ai_analyzer import (
    AIAnalysisError,
    AIAnalyzerService,
    _DownloadedImage,
    _ValidatedImageURL,
)


def run(coro):
    return asyncio.run(coro)


def make_settings(**overrides):
    values = {
        "GEMINI_API_KEY": "test-gemini-key",
        "GEMINI_MODEL": "gemini-2.5-flash",
        "GEMINI_API_BASE_URL": "https://generativelanguage.googleapis.com/v1beta",
        "GEMINI_REQUEST_TIMEOUT_SECONDS": 3.0,
        "GEMINI_IMAGE_MAX_BYTES": 1024,
    }
    values.update(overrides)
    return Settings(**values)


def gemini_response_payload(**overrides):
    payload = {
        "total_calories": 640,
        "carb_ratio": 50,
        "protein_ratio": 25,
        "fat_ratio": 25,
        "ai_comment": "균형 잡힌 식단입니다.",
    }
    payload.update(overrides)
    return {"candidates": [{"content": {"parts": [{"text": json.dumps(payload)}]}}]}


class FakeImageResponse:
    def __init__(self, status=200, headers=None, chunks=None):
        self.status = status
        self._headers = {key.lower(): value for key, value in (headers or {}).items()}
        self._chunks = list(chunks if chunks is not None else [b"image-bytes"])

    def getheader(self, name):
        return self._headers.get(name.lower())

    def read(self, size=-1):
        if not self._chunks:
            return b""
        chunk = self._chunks.pop(0)
        if size >= 0 and len(chunk) > size:
            self._chunks.insert(0, chunk[size:])
            return chunk[:size]
        return chunk


def make_service(handler, resolver=None, image_fetcher=None, **settings_overrides):
    calls = []

    def transport_handler(request: httpx.Request) -> httpx.Response:
        calls.append(request)
        return handler(request)

    def client_factory() -> httpx.AsyncClient:
        return httpx.AsyncClient(transport=httpx.MockTransport(transport_handler))

    if image_fetcher is None:
        image_fetcher = lambda validated_url: _DownloadedImage("image/jpeg", b"image-bytes")

    return (
        AIAnalyzerService(
            make_settings(**settings_overrides),
            client_factory,
            resolver=resolver or (lambda host: ["8.8.8.8"]),
            image_fetcher=image_fetcher,
        ),
        calls,
    )


class AIAnalyzerServiceTest(unittest.TestCase):
    def test_analyze_image_success_builds_gemini_payload_and_parses_result(self):
        def handler(request: httpx.Request) -> httpx.Response:
            body = json.loads(request.content)
            self.assertTrue(request.url.path.endswith("/models/gemini-2.5-flash:generateContent"))
            self.assertEqual(request.headers["x-goog-api-key"], "test-gemini-key")
            self.assertEqual(body["generationConfig"]["responseMimeType"], "application/json")
            self.assertIn("responseJsonSchema", body["generationConfig"])
            inline_data = body["contents"][0]["parts"][1]["inline_data"]
            self.assertEqual(inline_data["mime_type"], "image/jpeg")
            self.assertTrue(inline_data["data"])
            return httpx.Response(200, json=gemini_response_payload())

        service, calls = make_service(handler)

        result = run(service.analyze_image("https://cdn.example.com/meal.jpg"))

        self.assertEqual(
            result,
            {
                "total_calories": 640.0,
                "carb_ratio": 50.0,
                "protein_ratio": 25.0,
                "fat_ratio": 25.0,
                "ai_comment": "균형 잡힌 식단입니다.",
            },
        )
        self.assertEqual([call.method for call in calls], ["POST"])

    def test_missing_or_placeholder_config_fails_before_http(self):
        for api_key in ["", "dummy-key", "your-ai-api-key", "your-gemini-api-key"]:
            with self.subTest(api_key=api_key):
                def handler(request: httpx.Request) -> httpx.Response:  # pragma: no cover - should not be called
                    raise AssertionError("HTTP should not be called when Gemini config is invalid")

                service, calls = make_service(handler, GEMINI_API_KEY=api_key)

                with self.assertRaises(AIAnalysisError) as ctx:
                    run(service.analyze_image("https://cdn.example.com/meal.jpg"))

                self.assertEqual(ctx.exception.status_code, 503)
                self.assertEqual(calls, [])

    def test_insecure_scheme_is_rejected_before_http(self):
        def handler(request: httpx.Request) -> httpx.Response:  # pragma: no cover - should not be called
            raise AssertionError("HTTP should not be called for insecure image URLs")

        service, calls = make_service(handler)

        with self.assertRaises(AIAnalysisError) as ctx:
            run(service.analyze_image("http://cdn.example.com/meal.jpg"))

        self.assertEqual(ctx.exception.status_code, 422)
        self.assertEqual(calls, [])

    def test_redact_url_excludes_credentials_path_query_and_fragment(self):
        service, _ = make_service(lambda request: httpx.Response(200))

        redacted = service._redact_url(
            "https://user:secret@cdn.example.com:8443/private/meal.jpg?token=abc#frag"
        )

        self.assertEqual(redacted, "https://cdn.example.com:8443")
        self.assertNotIn("secret", redacted)
        self.assertNotIn("private", redacted)
        self.assertNotIn("token", redacted)

    def test_private_or_local_image_url_is_rejected_before_http(self):
        blocked_urls = [
            "https://127.0.0.1/meal.jpg",
            "https://10.0.0.10/meal.jpg",
            "https://100.64.0.1/meal.jpg",
            "https://169.254.169.254/latest/meta-data",
            "https://localhost/meal.jpg",
        ]
        for url in blocked_urls:
            with self.subTest(url=url):
                def handler(request: httpx.Request) -> httpx.Response:  # pragma: no cover - should not be called
                    raise AssertionError("HTTP should not be called for blocked image URLs")

                service, calls = make_service(handler)

                with self.assertRaises(AIAnalysisError) as ctx:
                    run(service.analyze_image(url))

                self.assertEqual(ctx.exception.status_code, 422)
                self.assertEqual(calls, [])

    def test_resolved_private_image_url_is_rejected_before_http(self):
        def handler(request: httpx.Request) -> httpx.Response:  # pragma: no cover - should not be called
            raise AssertionError("HTTP should not be called when DNS resolves to private IP")

        service, calls = make_service(handler, resolver=lambda host: ["10.0.0.5"])

        with self.assertRaises(AIAnalysisError) as ctx:
            run(service.analyze_image("https://cdn.example.com/meal.jpg"))

        self.assertEqual(ctx.exception.status_code, 422)
        self.assertEqual(calls, [])

    def test_validated_url_prefers_ipv4_connect_ip_when_available(self):
        service, _ = make_service(
            lambda request: httpx.Response(200),
            resolver=lambda host: ["2600:1900:4250:12::201b", "142.250.190.91"],
        )

        validated = service._validate_image_url("https://cdn.example.com/meal.jpg")

        self.assertEqual(validated.connect_ip, "142.250.190.91")

    def test_redirect_is_rejected_without_following_private_target(self):
        service, _ = make_service(lambda request: httpx.Response(200))

        with self.assertRaises(AIAnalysisError) as ctx:
            service._read_image_response(FakeImageResponse(302, headers={"location": "https://127.0.0.1/metadata"}))

        self.assertEqual(ctx.exception.status_code, 422)

    def test_image_fetch_failure_returns_422(self):
        def handler(request: httpx.Request) -> httpx.Response:
            raise AssertionError("Gemini should not be called when image download fails")

        def image_fetcher(validated_url):
            raise AIAnalysisError(status_code=422, detail="식단 이미지 URL을 다운로드할 수 없습니다.")

        service, _ = make_service(handler, image_fetcher=image_fetcher)

        with self.assertRaises(AIAnalysisError) as ctx:
            run(service.analyze_image("https://cdn.example.com/missing.jpg"))

        self.assertEqual(ctx.exception.status_code, 422)

    def test_unsupported_or_missing_mime_returns_422(self):
        cases = [({"content-type": "text/plain"}, b"not image"), ({}, b"image")]
        for headers, content in cases:
            with self.subTest(headers=headers):
                service, _ = make_service(lambda request: httpx.Response(200))

                with self.assertRaises(AIAnalysisError) as ctx:
                    service._read_image_response(
                        FakeImageResponse(200, headers=headers, chunks=[content])
                    )

                self.assertEqual(ctx.exception.status_code, 422)

    def test_empty_image_returns_422(self):
        service, _ = make_service(lambda request: httpx.Response(200))

        with self.assertRaises(AIAnalysisError) as ctx:
            service._read_image_response(
                FakeImageResponse(200, headers={"content-type": "image/png"}, chunks=[])
            )

        self.assertEqual(ctx.exception.status_code, 422)

    def test_oversized_image_returns_422(self):
        service, _ = make_service(lambda request: httpx.Response(200), GEMINI_IMAGE_MAX_BYTES=3)

        with self.assertRaises(AIAnalysisError) as ctx:
            service._read_image_response(
                FakeImageResponse(200, headers={"content-type": "image/png"}, chunks=[b"1234"])
            )

        self.assertEqual(ctx.exception.status_code, 422)

    def test_content_length_oversized_image_returns_422(self):
        service, _ = make_service(lambda request: httpx.Response(200), GEMINI_IMAGE_MAX_BYTES=3)

        with self.assertRaises(AIAnalysisError) as ctx:
            service._read_image_response(
                FakeImageResponse(
                    200,
                    headers={"content-type": "image/png", "content-length": "4"},
                    chunks=[],
                )
            )

        self.assertEqual(ctx.exception.status_code, 422)

    def test_fetch_image_sync_connects_to_prevalidated_ip_with_original_host(self):
        captured = {}
        original_connection = ai_module._BoundHTTPSConnection

        class FakeBoundHTTPSConnection:
            def __init__(self, host, port, connect_ip, timeout, context):
                captured.update(
                    {
                        "host": host,
                        "port": port,
                        "connect_ip": connect_ip,
                        "timeout": timeout,
                        "has_context": context is not None,
                    }
                )

            def request(self, method, target, headers):
                captured["method"] = method
                captured["target"] = target
                captured["headers"] = headers

            def getresponse(self):
                return FakeImageResponse(200, headers={"content-type": "image/webp"}, chunks=[b"safe"])

            def close(self):
                captured["closed"] = True

        ai_module._BoundHTTPSConnection = FakeBoundHTTPSConnection
        try:
            service, _ = make_service(lambda request: httpx.Response(200))
            image = service._fetch_image_sync(
                _ValidatedImageURL(
                    hostname="cdn.example.com",
                    port=443,
                    connect_ip="93.184.216.34",
                    request_target="/meal.webp?sig=abc",
                )
            )
        finally:
            ai_module._BoundHTTPSConnection = original_connection

        self.assertEqual(image.mime_type, "image/webp")
        self.assertEqual(image.data, b"safe")
        self.assertEqual(captured["host"], "cdn.example.com")
        self.assertEqual(captured["connect_ip"], "93.184.216.34")
        self.assertEqual(captured["target"], "/meal.webp?sig=abc")
        self.assertTrue(captured["closed"])

    def test_gemini_http_error_returns_502(self):
        def handler(request: httpx.Request) -> httpx.Response:
            return httpx.Response(500, json={"error": "provider down"})

        service, _ = make_service(handler)

        with self.assertRaises(AIAnalysisError) as ctx:
            run(service.analyze_image("https://cdn.example.com/meal.webp"))

        self.assertEqual(ctx.exception.status_code, 502)

    def test_gemini_timeout_returns_504(self):
        def handler(request: httpx.Request) -> httpx.Response:
            raise httpx.TimeoutException("timeout", request=request)

        service, _ = make_service(handler)

        with self.assertRaises(AIAnalysisError) as ctx:
            run(service.analyze_image("https://cdn.example.com/meal.jpg"))

        self.assertEqual(ctx.exception.status_code, 504)

    def test_invalid_gemini_output_returns_502(self):
        invalid_payloads = [
            {"candidates": []},
            {"candidates": [{"content": {"parts": [{"text": "not-json"}]}}]},
            {"candidates": [{"content": {"parts": [{"text": json.dumps({"total_calories": 100})}]}}]},
            gemini_response_payload(carb_ratio=10, protein_ratio=10, fat_ratio=10),
            gemini_response_payload(carb_ratio=120, protein_ratio=-10, fat_ratio=-10),
            gemini_response_payload(total_calories=float("nan")),
            gemini_response_payload(protein_ratio=float("inf")),
        ]
        for provider_payload in invalid_payloads:
            with self.subTest(provider_payload=provider_payload):
                def handler(request: httpx.Request) -> httpx.Response:
                    return httpx.Response(200, json=provider_payload)

                service, _ = make_service(
                    handler,
                    image_fetcher=lambda validated_url: _DownloadedImage("image/heif", b"image"),
                )

                with self.assertRaises(AIAnalysisError) as ctx:
                    run(service.analyze_image("https://cdn.example.com/meal.heif"))

                self.assertEqual(ctx.exception.status_code, 502)


if __name__ == "__main__":
    unittest.main()
