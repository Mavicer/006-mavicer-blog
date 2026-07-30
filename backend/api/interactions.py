from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlmodel import Session, select

from db import get_session, Post, Like, Favorite, tags_list
from schemas import InteractionToggleIn, InteractionOut, PostOut

router = APIRouter()


def _interactions(slug: str, client_id: str, session: Session) -> InteractionOut:
    likes = session.exec(select(Like).where(Like.post_slug == slug)).all()
    favorites = session.exec(select(Favorite).where(Favorite.post_slug == slug)).all()
    liked = any(l.client_id == client_id for l in likes) if client_id else False
    favorited = any(f.client_id == client_id for f in favorites) if client_id else False
    return InteractionOut(
        post_slug=slug,
        likes=len(likes),
        favorites=len(favorites),
        liked=liked,
        favorited=favorited,
    )


def _check_post(slug: str, session: Session):
    if not session.get(Post, slug):
        raise HTTPException(status_code=404, detail="文章不存在")


@router.get("/posts/{slug}/interactions", response_model=InteractionOut, summary="Interactions")
async def interactions(
    slug: str,
    client_id: str = "",
    session: Session = Depends(get_session),
):
    _check_post(slug, session)
    return _interactions(slug, client_id, session)


def _toggle(model, slug: str, client_id: str, session: Session, add: bool):
    existing = session.exec(
        select(model).where(model.post_slug == slug, model.client_id == client_id)
    ).first()
    if add and not existing:
        session.add(model(post_slug=slug, client_id=client_id))
    elif not add and existing:
        session.delete(existing)
    session.commit()


@router.post("/posts/{slug}/like", response_model=InteractionOut, summary="Toggle Like")
async def like(
    slug: str,
    payload: InteractionToggleIn,
    session: Session = Depends(get_session),
):
    _check_post(slug, session)
    existing = session.exec(
        select(Like).where(Like.post_slug == slug, Like.client_id == payload.client_id)
    ).first()
    _toggle(Like, slug, payload.client_id, session, add=not existing)
    return _interactions(slug, payload.client_id, session)


@router.post("/posts/{slug}/favorite", response_model=InteractionOut, summary="Toggle Favorite")
async def favorite(
    slug: str,
    payload: InteractionToggleIn,
    session: Session = Depends(get_session),
):
    _check_post(slug, session)
    existing = session.exec(
        select(Favorite).where(Favorite.post_slug == slug, Favorite.client_id == payload.client_id)
    ).first()
    _toggle(Favorite, slug, payload.client_id, session, add=not existing)
    return _interactions(slug, payload.client_id, session)


@router.get("/me/favorites", response_model=list[PostOut], summary="My Favorites")
async def my_favorites(
    client_id: str = "",
    session: Session = Depends(get_session),
):
    if not client_id:
        return []
    favs = session.exec(select(Favorite).where(Favorite.client_id == client_id)).all()
    out = []
    for f in favs:
        p = session.get(Post, f.post_slug)
        if p:
            out.append(
                PostOut(
                    slug=p.slug,
                    title=p.title,
                    date=p.date,
                    excerpt=p.excerpt,
                    source=p.source,
                    category=p.category,
                    tags=tags_list(p.tags),
                )
            )
    return out
