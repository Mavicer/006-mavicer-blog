from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select

from db import get_session, User, now_iso
from schemas import UserLogin, UserOut, TokenOut
from security import verify_password, create_token
from deps import get_current_user

router = APIRouter()


def to_out(u: User) -> UserOut:
    return UserOut(id=u.id, username=u.username, display_name=u.display_name, is_owner=u.is_owner)


@router.post("/auth/login", response_model=TokenOut, summary="Login")
async def login(payload: UserLogin, session: Session = Depends(get_session)):
    user = session.exec(select(User).where(User.username == payload.username)).first()
    if not user or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="用户名或密码错误")
    return TokenOut(access_token=create_token(user.id), token_type="bearer", user=to_out(user))


@router.get("/auth/me", response_model=UserOut, summary="Me")
async def me(user: User = Depends(get_current_user)):
    if not user:
        raise HTTPException(status_code=401, detail="Unauthorized")
    return to_out(user)
