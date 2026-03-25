import os
from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from passlib.context import CryptContext


pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")

_db = None


def set_database(database) -> None:
    global _db
    _db = database


def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def _secret_key() -> str:
    return os.environ["JWT_SECRET"]


def _token_expiry_minutes() -> int:
    return int(os.environ["TOKEN_EXPIRE_MINUTES"])


def create_access_token(subject: str) -> str:
    expires_delta = timedelta(minutes=_token_expiry_minutes())
    expire = datetime.now(timezone.utc) + expires_delta
    payload = {"sub": subject, "exp": expire}
    return jwt.encode(payload, _secret_key(), algorithm="HS256")


async def authenticate_user(email: str, password: str) -> Optional[dict]:
    if _db is None:
        raise RuntimeError("Database not configured for auth")
    user = await _db.users.find_one({"email": email.lower().strip()}, {"_id": 0})
    if not user or not verify_password(password, user["password_hash"]):
        return None
    return user


async def get_current_user(token: str = Depends(oauth2_scheme)) -> dict:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, _secret_key(), algorithms=["HS256"])
        user_id: Optional[str] = payload.get("sub")
        if not user_id:
            raise credentials_exception
    except JWTError as exc:
        raise credentials_exception from exc

    if _db is None:
        raise RuntimeError("Database not configured for auth")

    user = await _db.users.find_one({"id": user_id}, {"_id": 0})
    if not user:
        raise credentials_exception
    return user