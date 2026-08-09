-- D1 schema for mavicer-blog — mirrors backend/blog.db (anonymous-interaction model).
-- Only the 4 tables the public-interaction API needs (posts/comments/likes/favorites).
-- Run with: wrangler d1 execute mavicer-blog --file=backend-worker/schema.sql

CREATE TABLE IF NOT EXISTS post (
  slug TEXT NOT NULL PRIMARY KEY,
  title TEXT NOT NULL,
  date TEXT NOT NULL DEFAULT '',
  excerpt TEXT NOT NULL DEFAULT '',
  source TEXT NOT NULL DEFAULT 'online',
  category TEXT NOT NULL DEFAULT '未分类',
  tags TEXT NOT NULL DEFAULT '',          -- comma-separated; split in app layer
  body TEXT NOT NULL DEFAULT '',
  published INTEGER NOT NULL DEFAULT 1,  -- 0/1 (SQLite has no native bool)
  sort_order INTEGER NOT NULL DEFAULT 10,
  created_at TEXT NOT NULL DEFAULT '',
  updated_at TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS comment (
  id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  post_slug TEXT NOT NULL,
  body TEXT NOT NULL,
  author_name TEXT NOT NULL DEFAULT '访客',
  client_id TEXT NOT NULL DEFAULT '',   -- matches runtime migrateCommentTable in [[path]].ts
  created_at TEXT NOT NULL DEFAULT '',
  updated_at TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS "like" (
  id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  post_slug TEXT NOT NULL,
  client_id TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS favorite (
  id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  post_slug TEXT NOT NULL,
  client_id TEXT NOT NULL
);

-- Indexes that match the access patterns in interactions/comments.
CREATE INDEX IF NOT EXISTS idx_like_slug_client ON "like"(post_slug, client_id);
CREATE INDEX IF NOT EXISTS idx_fav_slug_client ON favorite(post_slug, client_id);
CREATE INDEX IF NOT EXISTS idx_comment_slug ON comment(post_slug);
