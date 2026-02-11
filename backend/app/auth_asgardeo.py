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
    
    # Construct JWKS URL from Issuer (assuming issuer ends in /oauth2/token)
    # Issuer: https://api.asgardeo.io/t/<org>/oauth2/token
    # JWKS:   https://api.asgardeo.io/t/<org>/oauth2/jwks
    jwks_url = settings.asgardeo_issuer.replace("/token", "/jwks")
    
    # Fallback if replace didn't work (e.g. trailing slash diff), explicitly try well-known if needed, 
    # but Asgardeo standard is usually the above. 
    # Let's be robust: if "oauth2/token" not in issuer, we might need a different strategy.
    if "/oauth2/token" not in settings.asgardeo_issuer and not jwks_url.endswith("/jwks"):
         # Try standard discovery or assume it's just the base url
         pass 

    async with httpx.AsyncClient(timeout=10) as c:
        # r = await c.get(f"{settings.asgardeo_issuer}/.well-known/jwks.json") 
        r = await c.get(jwks_url)
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
        print(f"DEBUG: Asgardeo Token Payload: {payload}")
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Invalid token: {e}")

    sub = payload.get("sub")
    email = payload.get("email") or payload.get("preferred_username")

    if not sub:
        raise HTTPException(status_code=401, detail="Token missing sub")

    # 1. Try to find by external_sub
    user = db.query(User).filter(User.external_sub == sub).first()

    if user:
        # Fix legacy "unknown" email if present (to satisfy Pydantic validation)
        if user.email == "unknown":
            user.email = f"u_{sub}@placeholder.com"
            db.add(user)
            db.commit()
            db.refresh(user)
        return user

    # 2. If not found, try to find by email (legacy/dev link)
    if email:
        user = db.query(User).filter(User.email == email).first()
        if user:
            # Found by email but missing sub -> Link them now
            if not user.external_sub:
                user.external_sub = sub
                db.add(user)
                db.commit()
                db.refresh(user)
            return user

    # 3. If still not found, create new user
    # Use a placeholder email if missing to satisfy EmailStr validation
    fallback_email = f"u_{sub}@placeholder.com"
    user = User(email=email or fallback_email, external_sub=sub)
    db.add(user)
    db.commit()
    db.refresh(user)

    return user
