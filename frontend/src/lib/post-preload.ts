import { getPost } from "@/hooks/usePosts";
import { getPost as fetchPost } from "./api";
import type { Post } from "@/hooks/usePosts";
import { renderMarkdown } from "./markdown";

const ready = new Map<string, { post: Post; expires: number }>();
const pending = new Map<string, Promise<Post>>();
export function cachedPost(slug: string): Post | undefined {
  const local = getPost(slug);
  if (local) return local;
  const entry = ready.get(slug);
  if (entry && entry.expires > Date.now()) return entry.post;
  ready.delete(slug);
}
export function loadPost(slug: string): Promise<Post> {
  const post = cachedPost(slug);
  if (post) return Promise.resolve(post);
  const existing = pending.get(slug);
  if (existing) return existing;
  const request = fetchPost(slug).then(post => {
    if (ready.size >= 20) ready.delete(ready.keys().next().value!);
    ready.set(slug, { post, expires: Date.now() + 30_000 });
    return post;
  }).finally(() => pending.delete(slug));
  pending.set(slug, request);
  return request;
}
export function preloadPost(slug: string) {
  void loadPost(slug).then(post => { renderMarkdown(post.body); }).catch(() => {});
}
