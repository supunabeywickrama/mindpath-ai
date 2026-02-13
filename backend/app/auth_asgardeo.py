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

async def _get_user_info(token: str):
    userinfo_url = settings.asgardeo_issuer.replace("/token", "/userinfo")
    async with httpx.AsyncClient(timeout=10) as c:
        r = await c.get(userinfo_url, headers={"Authorization": f"Bearer {token}"})
        r.raise_for_status()
        return r.json()

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
        # print(f"DEBUG: Asgardeo Token Payload: {payload}")
    except Exception as e:
        print(f"DEBUG: Asgardeo Token Validation Failed: {e}")
        raise HTTPException(status_code=401, detail=f"Invalid token: {e}")

    sub = payload.get("sub")
    email = payload.get("email") or payload.get("preferred_username")

    if not sub:
        raise HTTPException(status_code=401, detail="Token missing sub")
    
    # If email is missing in token, try UserInfo endpoint
    if not email:
        try:
            print("DEBUG: Email missing in token, fetching UserInfo...")
            user_info = await _get_user_info(token)
            # print(f"DEBUG: UserInfo response: {user_info}")
            email = user_info.get("email") or user_info.get("preferred_username")
        except Exception as e:
            print(f"ERROR: Failed to fetch UserInfo: {e}")

    # 1. Try to find by external_sub
    user = db.query(User).filter(User.external_sub == sub).first()

    if user:
        # Check if we need to update email
        # If we have a valid email from provider, and it differs from DB (or DB is placeholder/unknown)
        # Check if we need to update email
        # If we have a valid email from provider, and it differs from DB (or DB is placeholder/unknown)
        if email and (user.email != email or user.email.startswith("u_") or user.email == "unknown"):
            # Check for collision
            existing_user = db.query(User).filter(User.email == email).first()
            if existing_user and existing_user.id != user.id:
                print(f"DEBUG: Email {email} exists on user {existing_user.id}. Current user is {user.id}.")
                if not existing_user.external_sub:
                    print(f"DEBUG: Linking existing user {existing_user.id} to sub {sub} and detaching user {user.id}")
                    # Unlink current user
                    user.external_sub = None
                    db.add(user)
                    db.commit()
                    
                    # Link existing user
                    existing_user.external_sub = sub
                    db.add(existing_user)
                    db.commit()
                    db.refresh(existing_user)
                    return existing_user
                else:
                    print(f"WARNING: User {existing_user.id} has email {email} AND sub {existing_user.external_sub}. Cannot link.")
                    # Fallback: Do not update email, return current user (user A)
            else:
                # No collision, safe to update
                print(f"DEBUG: Updating user email from {user.email} to {email}")
                user.email = email
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
