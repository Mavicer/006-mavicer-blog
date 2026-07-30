from fastapi import APIRouter, Depends
from sqlmodel import Session, select, func

from db import get_session, Comment, User, Like, Favorite, PageView
from schemas import AnalyticsOut, PageViewIn
from deps import require_owner
from db import now_iso

router = APIRouter()


@router.post("/analytics/pageview", summary="Pageview")
async def pageview(payload: PageViewIn, session: Session = Depends(get_session)):
    session.add(PageView(path=payload.path, post_slug=payload.post_slug, created_at=now_iso()))
    session.commit()
    return {"ok": True}


@router.get("/analytics/summary", response_model=AnalyticsOut, summary="Analytics Summary")
async def summary(owner=Depends(require_owner), session: Session = Depends(get_session)):
    total_page_views = session.exec(select(func.count(PageView.id))).one()
    total_users = session.exec(select(func.count(User.id))).one()
    total_comments = session.exec(select(func.count(Comment.id))).one()
    total_likes = session.exec(select(func.count(Like.id))).one()
    total_favorites = session.exec(select(func.count(Favorite.id))).one()
    return AnalyticsOut(
        total_page_views=total_page_views,
        total_users=total_users,
        total_comments=total_comments,
        total_likes=total_likes,
        total_favorites=total_favorites,
    )
