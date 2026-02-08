from fastapi import Depends, HTTPException, Header
from sqlalchemy.orm import Session
from jose import jwt
import httpx

from app.deps import get_db
from app.config import settings
from app.models import User

_jwks_cache = None

async def _get_jwks():
    global _jwks_cache
    if _jwks_cache:
        return _jwks_cache
    async with httpx.AsyncClient(timeout=10) as c:
        r = await c.get(f"{settings.asgardeo_issuer}/.well-known/jwks.json")
        r.raise_for_status()
        _jwks_cache = r.json()
        return _jwks_cache

async def get_current_user_asgardeo(
    db: Session = Depends(get_db),
    authorization: str | None = Header(default=None),
):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing bearer token")

    token = authorization.split(" ", 1)[1].strip()
    jwks = await _get_jwks()

    try:
        payload = jwt.decode(
            token,
            jwks,
            algorithms=["RS256"],
            audience=settings.asgardeo_audience,
            issuer=settings.asgardeo_issuer,
            options={"verify_at_hash": False},
        )
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Invalid token: {e}")

    sub = payload.get("sub")
    email = payload.get("email") or payload.get("preferred_username")

    if not sub:
        raise HTTPException(status_code=401, detail="Token missing sub")

    user = db.query(User).filter(User.external_sub == sub).first()

    if user is None:
        user = User(email=email or "unknown", external_sub=sub)
        db.add(user)
        db.commit()
        db.refresh(user)

    return user
