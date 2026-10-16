// API client mirroring the original online-features.js logic.
import type { Post } from "@/hooks/usePosts";

export type PostDetail = Post & { body: string };

export type User = {
  id: string;
  username: string;
  display_name: string;
  is_owner: boolean;
  must_change_password: boolean;
};

export type Comment = {
  id: number;
  post_slug: string;
  body: string;
  author_name: string;
  created_at: string;
  updated_at: string;
  is_own: boolean;
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

let verifiedUser: User | null = null;
function apiBase(): string { return "/api"; }
export function currentUser(): User | null { return verifiedUser; }
function authHeaders(): Record<string, string> { return {}; }

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch(`${apiBase()}${path}`, {
      ...options,
      credentials: "same-origin",
      cache: "no-store",
      signal: controller.signal,
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
  } catch (e: any) {
    if (e?.name === "AbortError") {
      throw new Error("请求超时，请稍后重试");
    }
    throw e;
  } finally {
    clearTimeout(timeout);
  }
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

// ---- Accounts: same-origin HttpOnly cookie sessions ----
export async function login(payload: { username: string; password: string }) {
  return request<{ user: User }>(
    "/auth/login",
    { method: "POST", body: JSON.stringify(payload) }
  );
}

export async function me(): Promise<User> {
  return request("/auth/me");
}

export async function register(payload: { username: string; password: string; display_name?: string }) {
  return request<{ user: User }>("/auth/register", { method: "POST", body: JSON.stringify(payload) });
}
export function storeSession(result: { user: User }) { verifiedUser = result.user; }
export function clearSession() {
  verifiedUser = null;
  // Retire frontend-only identities and legacy bearer tokens. These are never
  // accepted as proof of login by the server.
  for (const key of ["MAVICER_TOKEN", "MAVICER_USER", "MAVICER_SESSION", "MAVICER_USERS"]) localStorage.removeItem(key);
}
export async function logout() {
  await request("/auth/logout", { method: "POST", body: "{}" });
  clearSession();
}
export async function changePassword(current_password: string, new_password: string) {
  await request("/auth/password", { method: "POST", body: JSON.stringify({ current_password, new_password }) });
  clearSession();
}
export async function listUsers(): Promise<User[]> { return request("/admin/users"); }
export async function resetUserPassword(id: string, current_password: string): Promise<{ temporary_password: string }> {
  return request(`/admin/users/${encodeURIComponent(id)}/reset-password`, { method: "POST", body: JSON.stringify({ current_password }) });
}

// ---- Stable anonymous browser identifier (UX only, not security) ----
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

export function clientId(): string {
  return onlineClientId();
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

// ---- Comments / Interactions ---- (anonymous, browser-identified)
export async function listComments(slug: string): Promise<Comment[]> {
  return request(`/posts/${slug}/comments`);
}
export async function createComment(
  slug: string,
  body: string
): Promise<Comment> {
  return request(`/posts/${slug}/comments`, {
    method: "POST",
    body: JSON.stringify({
      body,
    }),
  });
}
export async function deleteComment(slug: string, id: number) {
  return request(`/posts/${slug}/comments/${id}`, {
    method: "DELETE",
    body: "{}",
  });
}
export async function getInteractions(slug: string): Promise<Interaction> {
  return request(`/posts/${slug}/interactions?client_id=${encodeURIComponent(clientId())}`);
}
export async function like(slug: string, liked: boolean): Promise<Interaction> {
  return request(`/posts/${slug}/like`, {
    method: "POST",
    body: JSON.stringify({ client_id: clientId(), liked }),
  });
}
export async function favorite(slug: string, saved: boolean): Promise<Interaction> {
  return request(`/posts/${slug}/favorite?client_id=${encodeURIComponent(clientId())}`, {
    method: saved ? "PUT" : "DELETE", body: "{}",
  });
}
export async function myFavorites(): Promise<Post[]> { return request("/me/favorites"); }

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

// ---- Visits (Cloudflare Analytics API via Pages Function, 5min cache) ----
// Lifetime page views via archive+delta: a frozen base (site PV as of an
// anchor date) plus the live pageViews fetched from Cloudflare since. Only PV
// is surfaced — unique visitors can't be summed across periods on this plan.
export type VisitStats = { pv: number };
export async function getVisits(): Promise<VisitStats> {
  return request("/visits");
}
