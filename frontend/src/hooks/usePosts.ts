import { parseArticle } from "../../shared/articles";

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
    const { data, body } = parseArticle(raw);
    const slug =
      (data.slug as string) || path.split("/").pop()!.replace(/\.md$/, "");
    posts.push({
      slug,
      title: typeof data.title === "string" ? data.title : slug,
      date: typeof data.date === "string" ? data.date : new Date().toISOString(),
      excerpt: typeof data.excerpt === "string" ? data.excerpt : excerptFrom(body),
      category: typeof data.category === "string" ? data.category : "未分类",
      tags: Array.isArray(data.tags) ? data.tags.filter((tag): tag is string => typeof tag === "string") : [],
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
  if (!staticCache) staticCache = loadStaticPosts().filter((post) => post.published).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime() || b.sortOrder - a.sortOrder);
  return staticCache;
}

export function usePosts() {
  const posts = staticPosts();
  return { posts, categories: taxonomy(posts, "category"), tags: taxonomy(posts, "tags"), loading: false };
}

export function getPost(slug: string): Post | undefined {
  const p = staticPosts().find((x) => x.slug === slug);
  if (p) return p;
  // online posts: fetch synchronously is not possible; PostDetail page handles online fetch
  return undefined;
}

export function isOnlinePost(slug: string): boolean {
  return !staticPosts().some((x) => x.slug === slug);
}

export function totalWords(): number {
  return staticPosts().reduce((sum, p) => sum + p.body.length, 0);
}
