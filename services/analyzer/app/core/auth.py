from __future__ import annotations

import hmac
import logging

from fastapi import Header, HTTPException

from app.core.config import settings

logger = logging.getLogger("analyzer.auth")


def require_internal_token(x_internal_token: str | None = Header(default=None)) -> None:
    expected = settings.internal_token or ""
    provided = x_internal_token or ""
    if not expected or not provided:
        logger.warning("token interno rechazado: falta en %s", "servidor" if not expected else "petición")
        raise HTTPException(status_code=401, detail="Unauthorized")
    if not hmac.compare_digest(expected, provided):
        logger.warning("token interno rechazado: no coincide")
        raise HTTPException(status_code=401, detail="Unauthorized")
