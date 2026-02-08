from datetime import datetime, timedelta
from typing import Annotated
from fastapi import Depends, Header, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from sqlalchemy import select
from jose import jwt, JWTError
import bcrypt
import os

from app.deps import get_db
from app.config import settings
from app.models import User
from app.auth_asgardeo import get_current_user_asgardeo

# JWT
SECRET_KEY = os.getenv("SECRET_KEY", "dev_secret")
ALGORITHM = os.getenv("ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7 # 1 week

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login")

# Password hashing
def verify_password(plain_password, hashed_password):
    if isinstance(plain_password, str):
        plain_password = plain_password.encode('utf-8')
    if isinstance(hashed_password, str):
        hashed_password = hashed_password.encode('utf-8')
    return bcrypt.checkpw(plain_password, hashed_password)

def get_password_hash(password):
    if isinstance(password, str):
        password = password.encode('utf-8')
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password, salt)
    return hashed.decode('utf-8')

def create_access_token(data: dict, expires_delta: timedelta | None = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_user_local(token: str, db: Session):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    
    user = db.scalar(select(User).where(User.email == email))
    if user is None:
        raise credentials_exception
    return user

def get_current_user_dev(
    db: Session = Depends(get_db),
    x_user_id: str | None = Header(default=None, alias="X-User-Id"),
):
    if not x_user_id:
        raise HTTPException(status_code=401, detail="X-User-Id header required (dev)")
    u = db.scalar(select(User).where(User.id == int(x_user_id)))
    if not u:
        raise HTTPException(status_code=401, detail="User not found")
    return u

async def get_current_user(
    db: Session = Depends(get_db),
    authorization: str | None = Header(default=None),
    x_user_id: str | None = Header(default=None, alias="X-User-Id"),
):
    if settings.auth_mode == "local" and authorization:
        # Expect "Bearer <token>"
        try:
            scheme, token = authorization.split()
            if scheme.lower() != 'bearer':
                raise HTTPException(status_code=401, detail="Invalid auth scheme")
            return await get_current_user_local(token, db)
        except ValueError:
            raise HTTPException(status_code=401, detail="Invalid authorization header")
            
    if settings.auth_mode == "asgardeo":
        return await get_current_user_asgardeo(db=db, authorization=authorization)
    
    # Fallback/Default to dev if no specific mode or header missing
    return get_current_user_dev(db=db, x_user_id=x_user_id)
