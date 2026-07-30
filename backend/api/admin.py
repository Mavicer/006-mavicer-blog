from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select

from db import get_session, Post, Comment, now_iso, tags_list
from schemas import OnlinePostCreate, OnlinePostUpdate, AdminPostOut, CommentOut
from deps import require_owner

router = APIRouter()


def to_admin_out(p: Post) -> AdminPostOut:
    return AdminPostOut(
        slug=p.slug,
        title=p.title,
        date=p.date,
        excerpt=p.excerpt,
        source=p.source,
        category=p.category,
        tags=tags_list(p.tags),
        body=p.body,
        published=p.published,
        sort_order=p.sort_order,
        created_at=p.created_at,
        updated_at=p.updated_at,
    )


@router.get("/admin/posts", response_model=list[AdminPostOut], summary="List Admin Posts")
async def list_admin_posts(owner=Depends(require_owner), session: Session = Depends(get_session)):
    posts = session.exec(select(Post).order_by(Post.sort_order, Post.date.desc())).all()
    return [to_admin_out(p) for p in posts]


@router.post("/admin/posts", response_model=AdminPostOut, summary="Create Online Post")
async def create_post(
    payload: OnlinePostCreate,
    owner=Depends(require_owner),
    session: Session = Depends(get_session),
):
    if session.get(Post, payload.slug):
        raise HTTPException(status_code=409, detail="文章地址已存在")
    p = Post(
        slug=payload.slug,
        title=payload.title,
        excerpt=payload.excerpt,
        category=payload.category,
        tags=",".join(payload.tags),
        body=payload.body,
        published=payload.published,
        sort_order=payload.sort_order,
        date=now_iso()[:10],
        created_at=now_iso(),
        updated_at=now_iso(),
    )
    session.add(p)
    session.commit()
    session.refresh(p)
    return to_admin_out(p)


@router.get("/admin/posts/{slug}", response_model=AdminPostOut, summary="Get Admin Post")
async def get_admin_post(slug: str, owner=Depends(require_owner), session: Session = Depends(get_session)):
    p = session.get(Post, slug)
    if not p:
        raise HTTPException(status_code=404, detail="文章不存在")
    return to_admin_out(p)


@router.put("/admin/posts/{slug}", response_model=AdminPostOut, summary="Update Online Post")
async def update_post(
    slug: str,
    payload: OnlinePostUpdate,
    owner=Depends(require_owner),
    session: Session = Depends(get_session),
):
    p = session.get(Post, slug)
    if not p:
        raise HTTPException(status_code=404, detail="文章不存在")
    data = payload.model_dump(exclude_unset=True)
    if "slug" in data and data["slug"] and data["slug"] != slug:
        if session.get(Post, data["slug"]):
            raise HTTPException(status_code=409, detail="文章地址已存在")
        p.slug = data["slug"]
    for k in ("title", "excerpt", "body", "published", "sort_order", "category"):
        if k in data:
            setattr(p, k, data[k])
    if "tags" in data and data["tags"] is not None:
        p.tags = ",".join(data["tags"])
    p.updated_at = now_iso()
    session.add(p)
    session.commit()
    session.refresh(p)
    return to_admin_out(p)


@router.delete("/admin/posts/{slug}", summary="Delete Online Post")
async def delete_post(slug: str, owner=Depends(require_owner), session: Session = Depends(get_session)):
    p = session.get(Post, slug)
    if not p:
        raise HTTPException(status_code=404, detail="文章不存在")
    session.delete(p)
    session.commit()
    return {"ok": True}


@router.get("/admin/comments", response_model=list[CommentOut], summary="List Admin Comments")
async def list_admin_comments(owner=Depends(require_owner), session: Session = Depends(get_session)):
    comments = session.exec(select(Comment).order_by(Comment.created_at.desc())).all()
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


@router.delete("/admin/comments/{comment_id}", summary="Delete Admin Comment")
async def delete_admin_comment(comment_id: int, owner=Depends(require_owner), session: Session = Depends(get_session)):
    c = session.get(Comment, comment_id)
    if not c:
        raise HTTPException(status_code=404, detail="评论不存在")
    session.delete(c)
    session.commit()
    return {"ok": True}
