from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import select
from app.deps import get_db
from app.models import User
from app.schemas import DevLoginIn, UserOut, UserCreate, UserLogin, Token
from app.auth import get_current_user, get_password_hash, verify_password, create_access_token, ACCESS_TOKEN_EXPIRE_MINUTES
from datetime import timedelta

router = APIRouter(prefix="/auth", tags=["auth"])

@router.post("/register", response_model=Token)
def register(payload: UserCreate, db: Session = Depends(get_db)):
    # Check existing
    if db.scalar(select(User).where(User.email == payload.email)):
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Create user
    hashed_pw = get_password_hash(payload.password)
    user = User(email=payload.email, hashed_password=hashed_pw)
    db.add(user)
    db.commit()
    db.refresh(user)
    
    # Create token
    access_token = create_access_token(
        data={"sub": user.email},
        expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    return {"access_token": access_token, "token_type": "bearer"}

@router.post("/login", response_model=Token)
def login(payload: UserLogin, db: Session = Depends(get_db)):
    user = db.scalar(select(User).where(User.email == payload.email))
    if not user or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token = create_access_token(
        data={"sub": user.email},
        expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    return {"access_token": access_token, "token_type": "bearer"}

@router.get("/me", response_model=UserOut)
def read_users_me(current_user: User = Depends(get_current_user)):
    # Admin check logic can remain simplistic or be enhanced
    current_user_dict = {
        "id": current_user.id,
        "email": current_user.email,
        "created_at": current_user.created_at,
        "is_admin": current_user.email == "admin@mindpath.ai"
    }
    return current_user_dict

@router.post("/dev-login", response_model=UserOut)
def dev_login(payload: DevLoginIn, db: Session = Depends(get_db)):
    try:
        existing = db.scalar(select(User).where(User.email == payload.email))
        if existing:
            return {
                "id": existing.id,
                "email": existing.email,
                "created_at": existing.created_at,
                "is_admin": payload.email == "admin@mindpath.ai"
            }

        user = User(email=payload.email)
        db.add(user)
        db.commit()
        db.refresh(user)
        
        return {
            "id": user.id,
            "email": user.email,
            "created_at": user.created_at,
            "is_admin": payload.email == "admin@mindpath.ai"
        }
    except Exception as e:
        print(f"DEV LOGIN ERROR: {e}") # This will show in backend logs
        raise e
