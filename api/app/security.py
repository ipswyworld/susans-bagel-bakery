"""Single-admin auth with stdlib only: scrypt password hashes + HMAC-signed expiring tokens."""
import base64
import hashlib
import hmac
import json
import os
import time

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from . import config

_bearer = HTTPBearer(auto_error=False)


def hash_password(password: str) -> str:
    salt = os.urandom(16)
    digest = hashlib.scrypt(password.encode(), salt=salt, n=2**14, r=8, p=1)
    return f"scrypt${base64.b64encode(salt).decode()}${base64.b64encode(digest).decode()}"


def verify_password(password: str) -> bool:
    if config.ADMIN_PASSWORD_HASH:
        try:
            _, salt_b64, digest_b64 = config.ADMIN_PASSWORD_HASH.split("$")
            expected = base64.b64decode(digest_b64)
            actual = hashlib.scrypt(password.encode(), salt=base64.b64decode(salt_b64), n=2**14, r=8, p=1)
            return hmac.compare_digest(expected, actual)
        except Exception:
            return False
    if config.ADMIN_PASSWORD:
        return hmac.compare_digest(password.encode(), config.ADMIN_PASSWORD.encode())
    return False


def _sign(payload: bytes) -> str:
    return base64.urlsafe_b64encode(hmac.new(config.SECRET_KEY.encode(), payload, hashlib.sha256).digest()).decode()


def make_token() -> str:
    body = base64.urlsafe_b64encode(json.dumps({"exp": int(time.time()) + config.TOKEN_TTL_SECONDS}).encode()).decode()
    return f"{body}.{_sign(body.encode())}"


def _valid(token: str) -> bool:
    try:
        body, sig = token.split(".")
        if not hmac.compare_digest(sig, _sign(body.encode())):
            return False
        return json.loads(base64.urlsafe_b64decode(body))["exp"] > time.time()
    except Exception:
        return False


def require_admin(creds: HTTPAuthorizationCredentials | None = Depends(_bearer)) -> None:
    if creds is None or not _valid(creds.credentials):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Sign in again")
