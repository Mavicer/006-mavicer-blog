"""SQLModel database setup and models."""
import os
from datetime import datetime, timezone
from sqlmodel import SQLModel, Session, create_engine, select, Field, text

DB_PATH = os.environ.get("BLOG_DB_PATH", "blog.db")
engine = create_engine(
    f"sqlite:///{DB_PATH}",
    connect_args={"check_same_thread": False},
    echo=False,
)


class User(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    username: str
    display_name: str
    hashed_password: str
    is_owner: bool = False
    created_at: str = ""


class Post(SQLModel, table=True):
    slug: str = Field(primary_key=True)
    title: str
    date: str = ""
    excerpt: str = ""
    source: str = "online"
    category: str = "未分类"
    tags: str = ""  # comma-separated
    body: str = ""
    published: bool = True
    sort_order: int = 10
    created_at: str = ""
    updated_at: str = ""


class Comment(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    post_slug: str
    body: str
    author_name: str = "访客"  # anonymous comment author; no user binding
    created_at: str = ""
    updated_at: str = ""


class Like(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    post_slug: str
    client_id: str  # browser-local identifier (UX only, not security)


class Favorite(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    post_slug: str
    client_id: str  # browser-local identifier (UX only, not security)


class PageView(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    path: str
    post_slug: str | None = None
    created_at: str = ""


class OnlineReader(SQLModel, table=True):
    client_id: str = Field(primary_key=True)
    path: str = ""
    post_slug: str | None = None
    last_seen: str = ""


def init_db():
    SQLModel.metadata.create_all(engine)


def migrate_db():
    """Migrate legacy schema to the anonymous-interaction model.

    Old Comment/Like/Favorite tables had a ``user_id`` column (tied to the
    removed login system). The new schema uses ``author_name`` (Comment) and
    ``client_id`` (Like/Favorite) for anonymous, browser-identified
    interactions. SQLModel.create_all won't alter existing tables, so when the
    old schema is detected we drop the three tables and let create_all rebuild
    them. Idempotent: only runs when an old column is present. User/Post
    tables are never touched.
    """
    with Session(engine) as s:
        cols = {row[1] for row in s.exec(text("PRAGMA table_info(comment)")).all()}
        if "user_id" in cols:
            s.exec(text("DROP TABLE IF EXISTS comment"))
            s.exec(text("DROP TABLE IF EXISTS like"))
            s.exec(text("DROP TABLE IF EXISTS favorite"))
            s.commit()
            SQLModel.metadata.create_all(engine)


def ensure_owner():
    """Ensure an owner account exists for blog management.

    Public registration was removed; the single owner is bootstrapped here
    from env vars. The default password below is a DEVELOPMENT-ONLY fallback
    so local dev keeps working without configuration — it is intentionally
    weak and must be overridden via ADMIN_PASSWORD for any real deployment.
    """
    import logging

    from security import hash_password

    log = logging.getLogger("blog")
    username = os.environ.get("ADMIN_USERNAME", "admin")
    # DEV FALLBACK ONLY — set ADMIN_PASSWORD in .env for any non-local use.
    password = os.environ.get("ADMIN_PASSWORD", "kmz080810")
    with Session(engine) as s:
        if s.exec(select(User).where(User.is_owner == True)).first():  # noqa: E712
            return
        if s.exec(select(User).where(User.username == username)).first():
            return
        s.add(
            User(
                username=username,
                display_name=username,
                hashed_password=hash_password(password),
                is_owner=True,
                created_at=now_iso(),
            )
        )
        s.commit()
        log.warning(
            "Bootstrapped owner '%s' with a DEV-FALLBACK password. "
            "Set ADMIN_PASSWORD in .env before exposing this deployment.",
            username,
        )


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def get_session():
    with Session(engine) as s:
        yield s


def tags_list(s: str) -> list[str]:
    return [t.strip() for t in s.split(",") if t.strip()] if s else []


def seed_if_empty():
    """Seed a sample online post on first run so the API isn't empty."""
    with Session(engine) as s:
        if s.exec(select(Post)).first():
            return
        s.add(
            Post(
                slug="hello-from-backend",
                title="Hello from the backend",
                date=now_iso()[:10],
                excerpt="这是一篇由后端发布的示例文章。删除它或在前端 /admin 发布新文章。",
                source="online",
                category="随笔",
                tags="后端,示例",
                body="## 你好\n\n这是 FastAPI 后端发布的第一篇文章。\n\n```python\nprint('hello')\n```",
                published=True,
                sort_order=10,
                created_at=now_iso(),
                updated_at=now_iso(),
            )
        )
        s.commit()
