from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select

from db import get_session, Post, tags_list, now_iso
from schemas import PostOut, PostDetail

router = APIRouter()


def to_out(p: Post) -> PostOut:
    return PostOut(
        slug=p.slug,
        title=p.title,
        date=p.date,
        excerpt=p.excerpt,
        source=p.source,
        category=p.category,
        tags=tags_list(p.tags),
    )


def to_detail(p: Post) -> PostDetail:
    d = to_out(p)
    return PostDetail(**d.model_dump(), body=p.body)


@router.get("/posts", response_model=list[PostOut], summary="List Posts")
async def list_posts(session: Session = Depends(get_session)):
    posts = session.exec(
        select(Post).where(Post.published == True).order_by(Post.sort_order, Post.date.desc())
    ).all()
    return [to_out(p) for p in posts]


@router.get("/posts/{slug}", response_model=PostDetail, summary="Get Post")
async def get_post(slug: str, session: Session = Depends(get_session)):
    p = session.get(Post, slug)
    if not p or not p.published:
        raise HTTPException(status_code=404, detail="文章不存在")
    return to_detail(p)


@router.get("/search", response_model=list[PostOut], summary="Search")
async def search(q: str, session: Session = Depends(get_session)):
    if not q:
        return []
    posts = session.exec(
        select(Post).where(Post.published == True).order_by(Post.date.desc())
    ).all()
    ql = q.lower()
    return [
        to_out(p)
        for p in posts
        if ql in p.title.lower()
        or ql in p.excerpt.lower()
        or ql in p.body.lower()
        or ql in p.tags.lower()
    ]
