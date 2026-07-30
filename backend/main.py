"""FastAPI backend for Mavicer's Blog.

Mirrors the original aleph-null.cc API (22 endpoints) so the frontend's
online-features logic can run unchanged. Run with:

    uvicorn main:app --reload --port 8000

Then visit http://localhost:8000/api/docs for the Swagger UI.
"""
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from db import init_db, migrate_db, ensure_owner
from api import (
    health,
    auth,
    posts,
    comments,
    interactions,
    admin,
    analytics,
    online,
    uploads,
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    migrate_db()
    # seed an example post if empty (so /api/posts isn't empty on first run)
    from db import seed_if_empty
    seed_if_empty()
    ensure_owner()
    yield


app = FastAPI(
    title="Mavicer Blog API",
    version="0.1.0",
    lifespan=lifespan,
    root_path="/api",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
    allow_credentials=True,
)

# Mount uploads directory for serving uploaded images.
import os
os.makedirs("uploads", exist_ok=True)
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

app.include_router(health.router)
app.include_router(auth.router)
app.include_router(posts.router)
app.include_router(comments.router)
app.include_router(interactions.router)
app.include_router(admin.router)
app.include_router(analytics.router)
app.include_router(online.router)
app.include_router(uploads.router)
