"""Security: password hashing (argon2) + JWT.

Uses argon2-cffi directly instead of passlib to avoid the passlib+bcrypt 5.0
incompatibility (passlib 1.7.4 calls bcrypt internals removed in bcrypt 5.0).
"""
import os
from datetime import datetime, timedelta, timezone
from jose import jwt, JWTError
from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError, InvalidHash

SECRET_KEY = os.environ.get("BLOG_SECRET_KEY", "dev-secret-change-me-in-production")
ALGORITHM = "HS256"
TOKEN_EXPIRE_MINUTES = 60 * 24 * 30  # 30 days

OWNER_KEY = os.environ.get("OWNER_KEY", "change-me")

_hasher = PasswordHasher()


def hash_password(p: str) -> str:
    return _hasher.hash(p)


def verify_password(plain: str, hashed: str) -> bool:
    try:
        return _hasher.verify(hashed, plain)
    except (VerifyMismatchError, InvalidHash):
        return False


def create_token(user_id: int) -> str:
    expire = datetime.now(timezone.utc) + timedelta(minutes=TOKEN_EXPIRE_MINUTES)
    return jwt.encode({"sub": str(user_id), "exp": expire}, SECRET_KEY, algorithm=ALGORITHM)


def decode_token(token: str) -> int | None:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        sub = payload.get("sub")
        return int(sub) if sub else None
    except (JWTError, ValueError):
        return None
