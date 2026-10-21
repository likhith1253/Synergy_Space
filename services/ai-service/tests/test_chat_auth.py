import time

import jwt
import pytest
from fastapi.testclient import TestClient

from src.config import settings
from src.main import app
from src import auth

SECRET = "test-secret-for-pytest-only-0123456789abcdef"


@pytest.fixture(autouse=True)
def configure(monkeypatch):
    monkeypatch.setattr(settings, "jwt_secret", SECRET)
    monkeypatch.setattr(settings, "rate_limit_per_minute", 3)
    monkeypatch.setenv("MOCK_AI", "true")  # never reach the real Gemini API
    auth.reset_rate_limits()
    yield
    auth.reset_rate_limits()


client = TestClient(app)


def token(user="u1", secret=SECRET, alg="HS256", exp_in=300):
    return jwt.encode({"userId": user, "exp": int(time.time()) + exp_in}, secret, algorithm=alg)


def post(headers=None, body=None):
    return client.post("/ai/chat", json=body or {"userPrompt": "hi", "documentContent": ""}, headers=headers or {})


def bearer(t):
    return {"Authorization": f"Bearer {t}"}


def test_rejects_requests_without_token():
    assert post().status_code == 401


def test_rejects_wrong_secret_expired_and_other_algorithms():
    assert post(bearer(token(secret="other"))).status_code == 401
    assert post(bearer(token(exp_in=-10))).status_code == 401
    assert post(bearer(token(alg="HS512"))).status_code == 401
    assert post(bearer("garbage")).status_code == 401


def test_rejects_token_without_expiry():
    t = jwt.encode({"userId": "u1"}, SECRET, algorithm="HS256")
    assert post(bearer(t)).status_code == 401


def test_fails_closed_when_secret_not_configured(monkeypatch):
    monkeypatch.setattr(settings, "jwt_secret", None)
    assert post(bearer(token())).status_code == 503


def test_valid_token_reaches_the_model_layer():
    r = post(bearer(token()))
    assert r.status_code == 200
    assert "aiResponse" in r.json()


def test_per_user_rate_limit():
    h = bearer(token("heavy-user"))
    assert [post(h).status_code for _ in range(3)] == [200, 200, 200]
    assert post(h).status_code == 429
    # another user is unaffected
    assert post(bearer(token("other-user"))).status_code == 200


def test_oversized_prompt_and_context_are_rejected():
    h = bearer(token())
    assert post(h, {"userPrompt": "x" * (settings.max_prompt_chars + 1)}).status_code == 422
    assert post(h, {"userPrompt": "ok", "documentContent": "x" * (settings.max_context_chars + 1)}).status_code == 422
    assert post(h, {"userPrompt": ""}).status_code == 422
