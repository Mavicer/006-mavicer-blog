// articlesService.ts — localStorage-backed article store for the mock CMS.
//
// Mirrors the Post shape used by usePosts.ts so static .md articles and
// locally-created CMS articles merge seamlessly. Swap these functions for
// FastAPI calls when the real backend lands; the React layer is unchanged.

import type { Post } from "@/hooks/usePosts";

const KEY = "MAVICER_ARTICLES";

export type ArticleInput = {
  slug: string;
  title: string;
  excerpt: string;
  category: string;
  tags: string[];
  body: string; // markdown
  cover?: string;
  published?: boolean;
  sortOrder?: number;
};

export type Article = Post & {
  cover?: string;
  createdAt: string; // ISO
};

function read(): Article[] {
  try {
    const all = JSON.parse(localStorage.getItem(KEY) || "[]");
    // Filter out placeholder articles that were created during testing.
    // This runs on every read so the placeholder slugs never surface
    // even if they're still sitting in localStorage.
    return all.filter(
      (a: Article) => !PLACEHOLDER_SLUGS.includes(a.slug)
    );
  } catch {
    return [];
  }
}

// Slugs to permanently hide from the article list (test/placeholder posts).
const PLACEHOLDER_SLUGS = ["testpost", "hello-from-the-backend"];

function write(articles: Article[]): void {
  localStorage.setItem(KEY, JSON.stringify(articles));
  // Notify same-tab listeners (usePosts re-reads on storage events + custom).
  window.dispatchEvent(new Event("mavicer-articles-changed"));
}

function excerptFrom(body: string): string {
  const text = body
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/!\[[^\]]*\]\([^)]+\)/g, "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/[#>*`~_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return text.length > 200 ? `${text.slice(0, 200)}...` : text;
}

export function listArticles(): Article[] {
  return read()
    .filter((a) => a.published !== false)
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime() ||
        (b.sortOrder ?? 0) - (a.sortOrder ?? 0)
    );
}

export function listAllArticles(): Article[] {
  return read().sort(
    (a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime() ||
      (b.sortOrder ?? 0) - (a.sortOrder ?? 0)
  );
}

export function getArticle(slug: string): Article | undefined {
  return read().find((a) => a.slug === slug);
}

export function createArticle(input: ArticleInput): Article {
  const articles = read();
  if (articles.some((a) => a.slug === input.slug)) {
    const err = new Error("文章地址已存在") as Error & { status: number };
    err.status = 409;
    throw err;
  }
  const now = new Date().toISOString();
  const article: Article = {
    slug: input.slug,
    title: input.title,
    date: now,
    excerpt: input.excerpt || excerptFrom(input.body),
    category: input.category || "未分类",
    tags: Array.isArray(input.tags) ? input.tags : [],
    body: input.body,
    published: input.published !== false,
    sortOrder: input.sortOrder ?? 10,
    source: "local",
    cover: input.cover,
    createdAt: now,
  };
  write([...articles, article]);
  return article;
}

export function updateArticle(slug: string, input: ArticleInput): Article {
  const articles = read();
  const idx = articles.findIndex((a) => a.slug === slug);
  if (idx < 0) {
    const err = new Error("文章不存在") as Error & { status: number };
    err.status = 404;
    throw err;
  }
  const prev = articles[idx];
  const updated: Article = {
    ...prev,
    title: input.title,
    excerpt: input.excerpt || excerptFrom(input.body),
    category: input.category || "未分类",
    tags: Array.isArray(input.tags) ? input.tags : [],
    body: input.body,
    published: input.published !== false,
    sortOrder: input.sortOrder ?? prev.sortOrder ?? 10,
    cover: input.cover,
  };
  const next = [...articles];
  // Allow slug rename.
  if (input.slug && input.slug !== slug) {
    updated.slug = input.slug;
    next.splice(idx, 1);
    next.push(updated);
  } else {
    next[idx] = updated;
  }
  write(next);
  return updated;
}

export function deleteArticle(slug: string): void {
  write(read().filter((a) => a.slug !== slug));
}

/** Total body length across all local articles (for the footer word count). */
export function localWordCount(): number {
  return read().reduce((sum, a) => sum + a.body.length, 0);
}
