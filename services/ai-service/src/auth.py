"""Authentication and abuse protection for the AI endpoints.

The AI service spends paid Gemini quota, so every request must carry a valid access
token issued by auth-service (HS256, signed with the shared JWT_SECRET), and each user
is limited to a fixed number of requests per minute.
"""
import time
from collections import defaultdict, deque
from typing import Deque, Dict

import jwt
from fastapi import Depends, HTTPException, Request

from src.config import settings

_hits: Dict[str, Deque[float]] = defaultdict(deque)
_WINDOW_SECONDS = 60


def get_current_user_id(request: Request) -> str:
    """FastAPI dependency: returns the authenticated user id or raises 401/503."""
    if not settings.jwt_secret:
        # Fail closed: never serve model traffic when auth is not configured
        raise HTTPException(status_code=503, detail="AI service authentication is not configured")

    header = request.headers.get("authorization", "")
    if not header.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Authentication required")

    token = header[7:].strip()
    try:
        claims = jwt.decode(token, settings.jwt_secret, algorithms=["HS256"], options={"require": ["exp"]})
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    user_id = claims.get("userId")
    if not isinstance(user_id, str) or not user_id:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    return user_id


def enforce_rate_limit(user_id: str = Depends(get_current_user_id)) -> str:
    """Sliding-window per-user limit (in-memory: per process)."""
    now = time.monotonic()
    window = _hits[user_id]
    while window and now - window[0] > _WINDOW_SECONDS:
        window.popleft()
    if len(window) >= settings.rate_limit_per_minute:
        raise HTTPException(status_code=429, detail="Too many AI requests. Please slow down.")
    window.append(now)
    return user_id


def reset_rate_limits() -> None:
    """Test helper."""
    _hits.clear()
