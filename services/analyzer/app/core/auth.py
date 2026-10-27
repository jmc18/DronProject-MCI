from __future__ import annotations

import hmac

from fastapi import Header, HTTPException

from app.core.config import settings


def require_internal_token(x_internal_token: str | None = Header(default=None)) -> None:
    expected = settings.internal_token or ""
    provided = x_internal_token or ""
    if not expected or not provided:
        raise HTTPException(status_code=401, detail="Unauthorized")
    if not hmac.compare_digest(expected, provided):
        raise HTTPException(status_code=401, detail="Unauthorized")
