"""Pydantic schemas matching the original OpenAPI."""
from pydantic import BaseModel, Field


class UserLogin(BaseModel):
    username: str
    password: str


class UserOut(BaseModel):
    id: int
    username: str
    display_name: str
    is_owner: bool


class TokenOut(BaseModel):
    access_token: str
    token_type: str
    user: UserOut


class OnlinePostCreate(BaseModel):
    slug: str = Field(pattern=r"^[a-z0-9][a-z0-9\-]*$", min_length=2, max_length=160)
    title: str = Field(min_length=1, max_length=220)
    excerpt: str = Field(default="", max_length=500)
    body: str = Field(min_length=1)
    published: bool = True
    sort_order: int = 10
    category: str = Field(default="未分类", max_length=120)
    tags: list[str] = Field(default_factory=list, max_length=20)


class OnlinePostUpdate(BaseModel):
    slug: str | None = Field(default=None, pattern=r"^[a-z0-9][a-z0-9\-]*$", min_length=2, max_length=160)
    title: str | None = Field(default=None, min_length=1, max_length=220)
    excerpt: str | None = Field(default=None, max_length=500)
    body: str | None = None
    published: bool | None = None
    sort_order: int | None = None
    category: str | None = Field(default=None, max_length=120)
    tags: list[str] | None = Field(default=None, max_length=20)


class PostOut(BaseModel):
    slug: str
    title: str
    date: str | None
    excerpt: str
    source: str
    category: str
    tags: list[str]


class PostDetail(PostOut):
    body: str


class AdminPostOut(PostOut):
    body: str
    published: bool
    sort_order: int
    created_at: str
    updated_at: str


class CommentCreate(BaseModel):
    body: str
    author_name: str | None = None  # optional nickname; defaults to "访客"


class CommentOut(BaseModel):
    id: int
    post_slug: str
    body: str
    author_name: str
    created_at: str
    updated_at: str


class InteractionToggleIn(BaseModel):
    client_id: str = Field(min_length=1, max_length=120)


class InteractionOut(BaseModel):
    post_slug: str
    likes: int
    favorites: int
    liked: bool
    favorited: bool


class AnalyticsOut(BaseModel):
    total_page_views: int
    total_comments: int
    total_users: int
    total_likes: int
    total_favorites: int


class OnlinePingIn(BaseModel):
    client_id: str
    path: str = ""
    post_slug: str | None = Field(default=None, max_length=160)


class OnlineCountOut(BaseModel):
    online_readers: int


class PageViewIn(BaseModel):
    path: str
    post_slug: str | None = Field(default=None, max_length=160)
