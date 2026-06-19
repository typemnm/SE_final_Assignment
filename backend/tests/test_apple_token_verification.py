import base64
import json

import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from fastapi import HTTPException
from jose import JWTError

from app.domains.user import service as svc_module
from app.domains.user.service import _verify_apple_token


@pytest.fixture(autouse=True)
def reset_jwks_cache():
    svc_module._apple_jwks_cache = {"keys": [], "expires": 0.0}
    yield
    svc_module._apple_jwks_cache = {"keys": [], "expires": 0.0}


MOCK_JWKS = {"keys": [{"kid": "test-kid-1", "kty": "RSA", "alg": "RS256", "use": "sig", "n": "abc", "e": "AQAB"}]}
VALID_TOKEN = "eyJhbGciOiJSUzI1NiIsImtpZCI6InRlc3Qta2lkLTEifQ.eyJzdWIiOiJ1c2VyMTIzIiwiZW1haWwiOiJ0ZXN0QGV4YW1wbGUuY29tIiwiaXNzIjoiaHR0cHM6Ly9hcHBsZWlkLmFwcGxlLmNvbSIsImF1ZCI6ImNvbS5rZWxwdXMuYXBwIiwiZXhwIjo5OTk5OTk5OTk5fQ.signature"


def make_mock_jwks_response():
    mock_resp = MagicMock()
    mock_resp.status_code = 200
    mock_resp.json.return_value = MOCK_JWKS
    return mock_resp


@pytest.mark.asyncio
async def test_valid_apple_token_returns_sub_and_email():
    with patch("app.domains.user.service.httpx.AsyncClient") as mock_client_cls, \
         patch("jose.jwt.decode") as mock_decode:
        mock_client = AsyncMock()
        mock_client_cls.return_value.__aenter__ = AsyncMock(return_value=mock_client)
        mock_client_cls.return_value.__aexit__ = AsyncMock(return_value=False)
        mock_client.get = AsyncMock(return_value=make_mock_jwks_response())
        mock_decode.return_value = {"sub": "user123", "email": "test@example.com"}

        sub, email = await _verify_apple_token(VALID_TOKEN)
        assert sub == "user123"
        assert email == "test@example.com"


@pytest.mark.asyncio
async def test_malformed_token_raises_401():
    with pytest.raises(HTTPException) as exc_info:
        await _verify_apple_token("not.a.valid.jwt.token.with.too.many.parts.here")
    assert exc_info.value.status_code == 401


@pytest.mark.asyncio
async def test_wrong_algorithm_raises_401():
    header = base64.urlsafe_b64encode(json.dumps({"alg": "HS256", "kid": "x"}).encode()).decode().rstrip("=")
    payload = base64.urlsafe_b64encode(json.dumps({"sub": "u1"}).encode()).decode().rstrip("=")
    token = f"{header}.{payload}.sig"
    with pytest.raises(HTTPException) as exc_info:
        await _verify_apple_token(token)
    assert exc_info.value.status_code == 401


@pytest.mark.asyncio
async def test_unknown_kid_raises_401():
    header = base64.urlsafe_b64encode(json.dumps({"alg": "RS256", "kid": "unknown-kid"}).encode()).decode().rstrip("=")
    payload = base64.urlsafe_b64encode(json.dumps({"sub": "u1"}).encode()).decode().rstrip("=")
    token = f"{header}.{payload}.sig"

    with patch("app.domains.user.service.httpx.AsyncClient") as mock_client_cls:
        mock_client = AsyncMock()
        mock_client_cls.return_value.__aenter__ = AsyncMock(return_value=mock_client)
        mock_client_cls.return_value.__aexit__ = AsyncMock(return_value=False)
        mock_client.get = AsyncMock(return_value=make_mock_jwks_response())
        with pytest.raises(HTTPException) as exc_info:
            await _verify_apple_token(token)
        assert exc_info.value.status_code == 401


@pytest.mark.asyncio
async def test_jwks_fetch_failure_raises_401():
    header = base64.urlsafe_b64encode(json.dumps({"alg": "RS256", "kid": "test-kid-1"}).encode()).decode().rstrip("=")
    payload = base64.urlsafe_b64encode(json.dumps({"sub": "u1"}).encode()).decode().rstrip("=")
    token = f"{header}.{payload}.sig"

    with patch("app.domains.user.service.httpx.AsyncClient") as mock_client_cls:
        mock_client = AsyncMock()
        mock_client_cls.return_value.__aenter__ = AsyncMock(return_value=mock_client)
        mock_client_cls.return_value.__aexit__ = AsyncMock(return_value=False)
        mock_client.get = AsyncMock(side_effect=Exception("Network error"))
        with pytest.raises(HTTPException) as exc_info:
            await _verify_apple_token(token)
        assert exc_info.value.status_code == 401


@pytest.mark.asyncio
async def test_invalid_signature_raises_401():
    header = base64.urlsafe_b64encode(json.dumps({"alg": "RS256", "kid": "test-kid-1"}).encode()).decode().rstrip("=")
    payload = base64.urlsafe_b64encode(json.dumps({"sub": "u1"}).encode()).decode().rstrip("=")
    token = f"{header}.{payload}.badsig"

    with patch("app.domains.user.service.httpx.AsyncClient") as mock_client_cls, \
         patch("jose.jwt.decode") as mock_decode:
        mock_client = AsyncMock()
        mock_client_cls.return_value.__aenter__ = AsyncMock(return_value=mock_client)
        mock_client_cls.return_value.__aexit__ = AsyncMock(return_value=False)
        mock_client.get = AsyncMock(return_value=make_mock_jwks_response())
        mock_decode.side_effect = JWTError("Invalid signature")
        with pytest.raises(HTTPException) as exc_info:
            await _verify_apple_token(token)
        assert exc_info.value.status_code == 401


@pytest.mark.asyncio
async def test_expired_token_raises_401():
    header = base64.urlsafe_b64encode(json.dumps({"alg": "RS256", "kid": "test-kid-1"}).encode()).decode().rstrip("=")
    payload = base64.urlsafe_b64encode(json.dumps({"sub": "u1", "exp": 1}).encode()).decode().rstrip("=")
    token = f"{header}.{payload}.sig"

    with patch("app.domains.user.service.httpx.AsyncClient") as mock_client_cls, \
         patch("jose.jwt.decode") as mock_decode:
        mock_client = AsyncMock()
        mock_client_cls.return_value.__aenter__ = AsyncMock(return_value=mock_client)
        mock_client_cls.return_value.__aexit__ = AsyncMock(return_value=False)
        mock_client.get = AsyncMock(return_value=make_mock_jwks_response())
        mock_decode.side_effect = JWTError("Token expired")
        with pytest.raises(HTTPException) as exc_info:
            await _verify_apple_token(token)
        assert exc_info.value.status_code == 401


@pytest.mark.asyncio
async def test_jwks_cache_is_used_on_second_call():
    header = base64.urlsafe_b64encode(json.dumps({"alg": "RS256", "kid": "test-kid-1"}).encode()).decode().rstrip("=")
    payload_b = base64.urlsafe_b64encode(json.dumps({"sub": "u1"}).encode()).decode().rstrip("=")
    token = f"{header}.{payload_b}.sig"

    with patch("app.domains.user.service.httpx.AsyncClient") as mock_client_cls, \
         patch("jose.jwt.decode") as mock_decode:
        mock_client = AsyncMock()
        mock_client_cls.return_value.__aenter__ = AsyncMock(return_value=mock_client)
        mock_client_cls.return_value.__aexit__ = AsyncMock(return_value=False)
        mock_client.get = AsyncMock(return_value=make_mock_jwks_response())
        mock_decode.return_value = {"sub": "u1", "email": None}

        await _verify_apple_token(token)
        await _verify_apple_token(token)
        assert mock_client.get.call_count == 1
