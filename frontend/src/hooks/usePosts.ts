import { useEffect, useState } from "react";
import { listArticles, localWordCount } from "@/services/articlesService";

export type Post = {
  slug: string;
  title: string;
  date: string; // ISO
  excerpt: string;
  category: string;
  // Tag convention: 2–4 tags per article. Avoid over-generalization — a
  // tag should identify the post's core topic, not enumerate every entity
  // mentioned (e.g. a VPN guide uses [VPN, 教程, Clash], not every OS).
  tags: string[];
  body: string; // markdown
  published: boolean;
  sortOrder: number;
  source?: string;
  readingTime?: string; // optional word-count banner, e.g. "全文约4000字，阅读时长8分钟"
};

type Term = { name: string; count: number };

// Static module registry: add new posts here AND drop a .md file in src/data/posts/.
const modules = import.meta.glob("../data/posts/*.md", {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;

function parseFrontmatter(raw: string): { data: Record<string, any>; body: string } {
  const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!m) return { data: {}, body: raw };
  const data: Record<string, any> = {};
  const lines = m[1].split(/\r?\n/);
  for (const line of lines) {
    const kv = line.match(/^([A-Za-z0-9_]+):\s*(.*)$/);
    if (!kv) continue;
    const key = kv[1];
    let val: string = kv[2].trim();
    if (val.startsWith("[") && val.endsWith("]")) {
      val = val.slice(1, -1);
      data[key] = val
        .split(",")
        .map((s) => s.trim().replace(/^["']|["']$/g, ""))
        .filter(Boolean);
    } else {
      val = val.replace(/^["']|["']$/g, "");
      data[key] = val;
    }
  }
  return { data, body: m[2] };
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

function loadStaticPosts(): Post[] {
  const posts: Post[] = [];
  let order = 10;
  for (const [path, raw] of Object.entries(modules)) {
    const { data, body } = parseFrontmatter(raw);
    const slug =
      (data.slug as string) || path.split("/").pop()!.replace(/\.md$/, "");
    posts.push({
      slug,
      title: data.title || slug,
      date: data.date || new Date().toISOString(),
      excerpt: data.excerpt || excerptFrom(body),
      category: data.category || "未分类",
      tags: Array.isArray(data.tags) ? data.tags : [],
      body,
      published: data.published !== false,
      sortOrder: Number(data.sort_order ?? order),
      source: "static",
      readingTime: data.reading_time as string | undefined,
    });
    order += 10;
  }
  return posts;
}

function taxonomy(posts: Post[], key: "category" | "tags"): Term[] {
  const map = new Map<string, number>();
  for (const p of posts) {
    if (key === "category") {
      const c = p.category || "未分类";
      map.set(c, (map.get(c) || 0) + 1);
    } else {
      for (const t of p.tags) map.set(t, (map.get(t) || 0) + 1);
    }
  }
  return Array.from(map.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}

let staticCache: Post[] | null = null;
function staticPosts(): Post[] {
  if (!staticCache) staticCache = loadStaticPosts();
  return staticCache;
}

export function usePosts() {
  const [state, setState] = useState<{
    posts: Post[];
    categories: Term[];
    tags: Term[];
    loading: boolean;
  }>(() => {
    // hydrate synchronously from static posts + local CMS articles so
    // the UI doesn't flash empty.
    const p = mergePosts(staticPosts(), listArticles());
    return {
      posts: p,
      categories: taxonomy(p, "category"),
      tags: taxonomy(p, "tags"),
      loading: false,
    };
  });

  useEffect(() => {
    let active = true;
    const load = () => {
      if (!active) return;
      const merged = mergePosts(staticPosts(), listArticles());
      setState({
        posts: merged,
        categories: taxonomy(merged, "category"),
        tags: taxonomy(merged, "tags"),
        loading: false,
      });
    };
    load();
    // Re-merge when a CMS article is created/edited/deleted in another tab
    // or via the admin page (custom mavicer-articles-changed event).
    const onChanged = () => load();
    window.addEventListener("storage", onChanged);
    window.addEventListener("mavicer-articles-changed", onChanged);
    return () => {
      active = false;
      window.removeEventListener("storage", onChanged);
      window.removeEventListener("mavicer-articles-changed", onChanged);
    };
  }, []);

  return state;
}

/** Merge sources: local CMS articles first, then static .md posts, then online. */
function mergePosts(...sources: Post[][]): Post[] {
  const seen = new Set<string>();
  const out: Post[] = [];
  for (const src of sources) {
    for (const p of src) {
      if (seen.has(p.slug)) continue;
      seen.add(p.slug);
      out.push(p);
    }
  }
  return out.sort(
    (a, b) =>
      new Date(b.date).getTime() - new Date(a.date).getTime() ||
      (b.sortOrder ?? 0) - (a.sortOrder ?? 0)
  );
}

export function getPost(slug: string): Post | undefined {
  // try local CMS articles first (newer), then static, then online (async-only)
  const local = listArticles().find((x) => x.slug === slug);
  if (local) return local;
  const p = staticPosts().find((x) => x.slug === slug);
  if (p) return p;
  // online posts: fetch synchronously is not possible; PostDetail page handles online fetch
  return undefined;
}

export function isOnlinePost(slug: string): boolean {
  if (listArticles().some((x) => x.slug === slug)) return false;
  return !staticPosts().some((x) => x.slug === slug);
}

export function totalWords(): number {
  return staticPosts().reduce((sum, p) => sum + p.body.length, 0) + localWordCount();
}
