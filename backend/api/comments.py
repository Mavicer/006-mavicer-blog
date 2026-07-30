from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select

from db import get_session, Post, Comment, now_iso
from schemas import CommentCreate, CommentOut
from deps import require_owner

router = APIRouter()

# --- minimal anonymous rate-limit placeholder -------------------------------
# A single in-memory counter per (client_id, action) with a coarse per-minute
# cap. Not a robust anti-abuse system — just enough to blunt naive spamming.
# Hard limit; not configurable. Safe to replace with a real limiter later.
_COMMENT_RATE_PER_MIN = 10
_rate: dict[tuple[str, str], list[float]] = {}


def _rate_ok(key: tuple[str, str]) -> bool:
    import time

    now = time.time()
    hits = [t for t in _rate.get(key, []) if now - t < 60.0]
    if len(hits) >= _COMMENT_RATE_PER_MIN:
        _rate[key] = hits
        return False
    hits.append(now)
    _rate[key] = hits
    return True


@router.get("/posts/{slug}/comments", response_model=list[CommentOut], summary="List Comments")
async def list_comments(slug: str, session: Session = Depends(get_session)):
    comments = session.exec(
        select(Comment).where(Comment.post_slug == slug).order_by(Comment.created_at.desc())
    ).all()
    return [
        CommentOut(
            id=c.id,
            post_slug=c.post_slug,
            body=c.body,
            author_name=c.author_name,
            created_at=c.created_at,
            updated_at=c.updated_at,
        )
        for c in comments
    ]


@router.post("/posts/{slug}/comments", response_model=CommentOut, summary="Create Comment")
async def create_comment(
    slug: str,
    payload: CommentCreate,
    session: Session = Depends(get_session),
):
    if not session.get(Post, slug):
        raise HTTPException(status_code=404, detail="文章不存在")
    body = (payload.body or "").strip()
    if not body:
        raise HTTPException(status_code=422, detail="评论不能为空")
    author = (payload.author_name or "").strip() or "访客"
    # client_id is unknown here without a request body field; use author+slug
    # as the rate key. Coarse but prevents obvious flooding.
    if not _rate_ok((slug, author)):
        raise HTTPException(status_code=429, detail="评论过于频繁，请稍后再试")
    c = Comment(
        post_slug=slug,
        body=body,
        author_name=author[:60],
        created_at=now_iso(),
        updated_at=now_iso(),
    )
    session.add(c)
    session.commit()
    session.refresh(c)
    return CommentOut(
        id=c.id,
        post_slug=c.post_slug,
        body=c.body,
        author_name=c.author_name,
        created_at=c.created_at,
        updated_at=c.updated_at,
    )


@router.delete("/posts/{slug}/comments/{comment_id}", summary="Delete Comment")
async def delete_comment(
    slug: str,
    comment_id: int,
    owner=Depends(require_owner),
    session: Session = Depends(get_session),
):
    c = session.get(Comment, comment_id)
    if not c or c.post_slug != slug:
        raise HTTPException(status_code=404, detail="评论不存在")
    session.delete(c)
    session.commit()
    return {"ok": True}
