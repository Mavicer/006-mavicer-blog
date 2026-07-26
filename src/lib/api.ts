// API client mirroring the original online-features.js logic.
import type { Post } from "@/hooks/usePosts";

export type PostDetail = Post & { body: string };

export type User = {
  id: number;
  username: string;
  display_name: string;
  is_owner: boolean;
};

export type Comment = {
  id: number;
  post_slug: string;
  body: string;
  created_at: string;
  updated_at: string;
  user: User;
};

export type Interaction = {
  post_slug: string;
  likes: number;
  favorites: number;
  liked: boolean;
  favorited: boolean;
};

export type Analytics = {
  total_page_views: number;
  total_users: number;
  total_comments: number;
  total_likes: number;
  total_favorites: number;
};

export type AdminPost = PostDetail & {
  published: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

const TOKEN_KEY = "MAVICER_TOKEN";
const USER_KEY = "MAVICER_USER";

function apiBase(): string {
  // In dev, Vite proxies /api -> backend. In production, same-origin /api.
  return (import.meta.env.VITE_API_BASE as string) || "/api";
}

export function token(): string {
  return localStorage.getItem(TOKEN_KEY) || "";
}

export function currentUser(): User | null {
  try {
    return JSON.parse(localStorage.getItem(USER_KEY) || "null");
  } catch {
    return null;
  }
}

function authHeaders(): Record<string, string> {
  const t = token();
  return t ? { Authorization: `Bearer ${t}` } : {};
}

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const res = await fetch(`${apiBase()}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(),
      ...(options.headers || {}),
    },
  });
  if (!res.ok) {
    let detail = `HTTP ${res.status}`;
    try {
      const body = await res.json();
      detail = body?.detail
        ? Array.isArray(body.detail)
          ? body.detail.map((d: any) => d.msg || d.message || JSON.stringify(d)).join("；")
          : String(body.detail)
        : detail;
    } catch {
      /* keep status */
    }
    const err = new Error(detail) as Error & { status: number };
    err.status = res.status;
    throw err;
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

export async function uploadImage(file: File): Promise<{ url: string; filename: string }> {
  const fd = new FormData();
  fd.append("file", file);
  const res = await fetch(`${apiBase()}/admin/uploads`, {
    method: "POST",
    headers: authHeaders(),
    body: fd,
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

// ---- Auth ----
export async function register(payload: {
  username: string;
  password: string;
  display_name?: string;
  owner_key?: string;
}) {
  return request<{ access_token: string; token_type: string; user: User }>(
    "/auth/register",
    { method: "POST", body: JSON.stringify(payload) }
  );
}

export async function login(payload: { username: string; password: string }) {
  return request<{ access_token: string; token_type: string; user: User }>(
    "/auth/login",
    { method: "POST", body: JSON.stringify(payload) }
  );
}

export async function me(): Promise<User> {
  return request("/auth/me");
}

export function storeSession(result: { access_token: string; user: User }) {
  localStorage.setItem(TOKEN_KEY, result.access_token);
  localStorage.setItem(USER_KEY, JSON.stringify(result.user));
}

export function logout() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

// ---- Posts ----
export async function listPosts(): Promise<Post[]> {
  return request("/posts");
}
export async function getPost(slug: string): Promise<PostDetail> {
  return request(`/posts/${slug}`);
}
export async function searchPosts(q: string): Promise<Post[]> {
  return request(`/search?q=${encodeURIComponent(q)}`);
}

// ---- Comments / Interactions ----
export async function listComments(slug: string): Promise<Comment[]> {
  return request(`/posts/${slug}/comments`);
}
export async function createComment(slug: string, body: string): Promise<Comment> {
  return request(`/posts/${slug}/comments`, {
    method: "POST",
    body: JSON.stringify({ body }),
  });
}
export async function deleteComment(slug: string, id: number) {
  return request(`/posts/${slug}/comments/${id}`, { method: "DELETE" });
}
export async function getInteractions(slug: string): Promise<Interaction> {
  return request(`/posts/${slug}/interactions`);
}
export async function like(slug: string): Promise<Interaction> {
  return request(`/posts/${slug}/like`, { method: "POST" });
}
export async function unlike(slug: string): Promise<Interaction> {
  return request(`/posts/${slug}/like`, { method: "DELETE" });
}
export async function favorite(slug: string): Promise<Interaction> {
  return request(`/posts/${slug}/favorite`, { method: "POST" });
}
export async function unfavorite(slug: string): Promise<Interaction> {
  return request(`/posts/${slug}/favorite`, { method: "DELETE" });
}
export async function myFavorites(): Promise<Post[]> {
  return request("/me/favorites");
}

// ---- Admin ----
export async function listAdminPosts(): Promise<AdminPost[]> {
  return request("/admin/posts");
}
export async function getAdminPost(slug: string): Promise<AdminPost> {
  return request(`/admin/posts/${slug}`);
}
export async function createAdminPost(p: any): Promise<AdminPost> {
  return request("/admin/posts", {
    method: "POST",
    body: JSON.stringify(p),
  });
}
export async function updateAdminPost(slug: string, p: any): Promise<AdminPost> {
  return request(`/admin/posts/${slug}`, {
    method: "PUT",
    body: JSON.stringify(p),
  });
}
export async function deleteAdminPost(slug: string) {
  return request(`/admin/posts/${slug}`, { method: "DELETE" });
}
export async function listAdminComments(): Promise<Comment[]> {
  return request("/admin/comments");
}
export async function deleteAdminComment(id: number) {
  return request(`/admin/comments/${id}`, { method: "DELETE" });
}

// ---- Analytics ----
export async function getAnalytics(): Promise<Analytics> {
  return request("/analytics/summary");
}
export async function trackPageView(path: string, postSlug?: string) {
  try {
    await request("/analytics/pageview", {
      method: "POST",
      body: JSON.stringify({ path, post_slug: postSlug || null }),
    });
  } catch {
    /* never block on analytics */
  }
}

// ---- Online readers ----
function onlineClientId(): string {
  const key = "MAVICER_ONLINE_CLIENT_ID";
  let v: string = localStorage.getItem(key) || "";
  if (!v) {
    v =
      (window.crypto as any)?.randomUUID?.() ||
      `client-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    localStorage.setItem(key, v);
  }
  return v;
}

export async function pingOnline(path: string, postSlug?: string): Promise<number> {
  const r = await request<{ online_readers: number }>("/online/ping", {
    method: "POST",
    body: JSON.stringify({
      client_id: onlineClientId(),
      path: path.slice(0, 300),
      post_slug: postSlug || null,
    }),
  });
  return r.online_readers;
}
