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
  options: RequestInit = {}, timeoutMs = 8000
): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
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
  try {
    for (const key of ["MAVICER_TOKEN", "MAVICER_USER", "MAVICER_SESSION", "MAVICER_USERS"]) localStorage.removeItem(key);
  } catch { /* Cookie sessions do not depend on browser localStorage. */ }
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

export type EditorArticle = { slug: string; sha: string; data: Record<string, unknown>; body: string };
export type PublishInput = { request_id: string; slug: string; sha: string; action: "create" | "update";
  title: string; category: string; tags: string[]; excerpt: string; mode: "plain" | "markdown"; body: string };
export type PublishJob = { id: string; slug: string; state: string; error: string; commit_sha: string; file_sha: string; article_url: string; commit_url: string };
export function publishingConfig(): Promise<{ configured: boolean; repository: string }> { return request("/admin/publishing/config"); }
export function editorArticle(slug: string): Promise<EditorArticle> { return request(`/admin/content/${encodeURIComponent(slug)}`); }
export function publishArticle(payload: PublishInput): Promise<PublishJob> {
  return request("/admin/publishing", { method: "POST", body: JSON.stringify(payload) }, 30000);
}
export function publishJob(id: string): Promise<PublishJob> { return request(`/admin/publishing/jobs/${id}`, {}, 20000); }

// ---- Stable anonymous browser identifier (UX only, not security) ----
let memoryClientId = "";
function onlineClientId(): string {
  if (memoryClientId) return memoryClientId;
  const key = "MAVICER_ONLINE_CLIENT_ID";
  try { memoryClientId = localStorage.getItem(key) || ""; } catch { /* blocked storage */ }
  if (memoryClientId && memoryClientId.length <= 120) return memoryClientId;
  memoryClientId = crypto.randomUUID();
  try { localStorage.setItem(key, memoryClientId); } catch { /* Keep this tab's identifier in memory. */ }
  return memoryClientId;
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

// ---- Comments / Interactions ---- (account comments and favorites; visitor likes)
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
export async function updateComment(slug: string, id: number, body: string): Promise<Comment> {
  return request(`/posts/${encodeURIComponent(slug)}/comments/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ body }),
  });
}
export async function deleteComment(slug: string, id: number) {
  return request(`/posts/${encodeURIComponent(slug)}/comments/${id}`, {
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

// ---- First-party visits and recent active browsers ----
export type VisitStats = { pv: number; online: number };
export async function getVisits(): Promise<VisitStats> {
  return validateVisits(await request("/visits"));
}
export async function reportVisit(event: { kind: "start" | "pageview" | "heartbeat"; path: string; event_id?: string }): Promise<VisitStats> {
  return validateVisits(await request("/visits", { method: "POST", body: JSON.stringify(event) }));
}
function validateVisits(value: unknown): VisitStats {
  const data = value as Partial<VisitStats> | null;
  if (!data || !Number.isSafeInteger(data.pv) || Number(data.pv) < 650 ||
      !Number.isSafeInteger(data.online) || Number(data.online) < 0) throw new Error("访问统计暂时不可用");
  return { pv: Number(data.pv), online: Number(data.online) };
}
