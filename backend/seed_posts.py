"""Seed static markdown posts into the backend Post table.

Reads ../frontend/src/data/posts/*.md, parses the YAML frontmatter with a
simple regex (no pyyaml dependency — mirrors frontend/src/hooks/usePosts.ts
parseFrontmatter), and upserts each post by slug. Idempotent: re-running
updates existing rows without duplicating. Static markdown remains the
single source of truth for article content; this only ensures the slug
exists in the backend so comments / likes / favorites resolve (no 404).

Run from the backend/ directory:

    .venv/bin/python seed_posts.py
"""
from __future__ import annotations

import re
import sys
from pathlib import Path

from sqlmodel import Session, select

from db import Post, engine, init_db, now_iso

POSTS_DIR = Path(__file__).resolve().parent.parent / "frontend" / "src" / "data" / "posts"

_FRONTMATTER_RE = re.compile(r"^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$")
_KV_RE = re.compile(r"^([A-Za-z0-9_]+):\s*(.*)$")


def _parse_frontmatter(raw: str) -> tuple[dict, str]:
    m = _FRONTMATTER_RE.match(raw)
    if not m:
        return {}, raw
    data: dict = {}
    for line in m.group(1).splitlines():
        kv = _KV_RE.match(line)
        if not kv:
            continue
        key, val = kv.group(1), kv.group(2).strip()
        if val.startswith("[") and val.endswith("]"):
            inner = val[1:-1]
            data[key] = [
                s.strip().strip("\"'")
                for s in inner.split(",")
                if s.strip()
            ]
        else:
            data[key] = val.strip("\"'")
    return data, m.group(2)


def _tags_str(tags: object) -> str:
    if isinstance(tags, list):
        return ",".join(str(t).strip() for t in tags if str(t).strip())
    if isinstance(tags, str) and tags:
        return tags
    return ""


def main() -> int:
    if not POSTS_DIR.is_dir():
        print(f"[seed] posts dir not found: {POSTS_DIR}", file=sys.stderr)
        return 1

    init_db()
    files = sorted(POSTS_DIR.glob("*.md"))
    print(f"[seed] found {len(files)} markdown file(s) in {POSTS_DIR}")

    created = 0
    updated = 0
    with Session(engine) as s:
        for path in files:
            raw = path.read_text(encoding="utf-8")
            data, body = _parse_frontmatter(raw)
            slug = data.get("slug") or path.stem
            published = data.get("published", "true") != "false"
            try:
                sort_order = int(data.get("sort_order", 10))
            except (TypeError, ValueError):
                sort_order = 10
            date = data.get("date", now_iso()[:10])

            existing = s.get(Post, slug)
            if existing:
                existing.title = data.get("title", slug)
                existing.excerpt = data.get("excerpt", "")
                existing.category = data.get("category", "未分类")
                existing.tags = _tags_str(data.get("tags"))
                existing.body = body
                existing.published = published
                existing.sort_order = sort_order
                existing.date = date
                existing.source = "online"
                existing.updated_at = now_iso()
                s.add(existing)
                updated += 1
                print(f"  [update] {slug}")
            else:
                s.add(
                    Post(
                        slug=slug,
                        title=data.get("title", slug),
                        date=date,
                        excerpt=data.get("excerpt", ""),
                        source="online",
                        category=data.get("category", "未分类"),
                        tags=_tags_str(data.get("tags")),
                        body=body,
                        published=published,
                        sort_order=sort_order,
                        created_at=now_iso(),
                        updated_at=now_iso(),
                    )
                )
                created += 1
                print(f"  [create] {slug}")
        s.commit()

    print(f"[seed] done: {created} created, {updated} updated")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
