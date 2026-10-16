import { HttpError, type Context } from "./http";

export const REPOSITORY = "Mavicer/006-mavicer-blog";
export const ARTICLE_DIRECTORY = "frontend/src/data/posts/";
export const PRODUCTION_ORIGIN = "https://blog-cmc.pages.dev";
export const validSlug = (slug: string) => /^[a-z0-9][a-z0-9_-]{0,99}$/.test(slug);

export class GithubError extends HttpError {
  constructor(status: number, message: string, public definitive = true) { super(status, message); }
}
export async function boundedJson<T>(response: Response, limit = 800_000): Promise<T> {
  const reader = response.body?.getReader();
  if (!reader) throw new Error("Empty upstream response");
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > limit) { await reader.cancel(); throw new Error("Upstream response too large"); }
    chunks.push(value);
  }
  const data = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { data.set(chunk, offset); offset += chunk.byteLength; }
  return JSON.parse(new TextDecoder().decode(data)) as T;
}
export async function github<T>(ctx: Context, resource: string, options: RequestInit = {}): Promise<T> {
  const token = ctx.env.GITHUB_PUBLISH_TOKEN;
  if (!token) throw new HttpError(503, "发布服务尚未配置 GitHub 凭据，请联系博主完成配置");
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const response = await fetch(`https://api.github.com/repos/${REPOSITORY}/${resource}`, {
      ...options, signal: controller.signal,
      headers: { Accept: "application/vnd.github+json", "Content-Type": "application/json",
        "User-Agent": "Mavicer-Blog-Publisher", "X-GitHub-Api-Version": "2026-03-10",
        Authorization: `Bearer ${token}` },
    });
    if (!response.ok) {
      await response.body?.cancel();
      const message = response.status === 404 ? "GitHub 中未找到文章" : response.status === 401 || response.status === 403 ? "GitHub 凭据无效、过期或权限不足" : response.status === 409 || response.status === 422 ? "文章版本已变化或文件名冲突，请重新加载后再发布" : "GitHub 服务暂时不可用";
      throw new GithubError(response.status, message, response.status < 500);
    }
    return await boundedJson<T>(response);
  } catch (error) {
    if (error instanceof GithubError || error instanceof HttpError) throw error;
    throw new GithubError(503, "GitHub 请求超时或网络中断，正在核实是否已经提交", false);
  } finally { clearTimeout(timeout); }
}

export type GithubFile = { type: string; sha: string; content: string; size: number; encoding: string; path: string };
export async function readArticleFile(ctx: Context, path: string): Promise<GithubFile | null> {
  if (!path.startsWith(ARTICLE_DIRECTORY) || !/^[a-z0-9][a-z0-9_-]{0,99}\.md$/.test(path.slice(ARTICLE_DIRECTORY.length))) throw new HttpError(422, "不允许访问这个文件路径");
  try {
    const file = await github<GithubFile>(ctx, `contents/${path}?ref=main`);
    if (file.type !== "file" || file.encoding !== "base64" || file.size > 400_000) throw new HttpError(422, "文章文件格式不受支持或内容过长");
    return file;
  } catch (error) { if (error instanceof GithubError && error.status === 404) return null; throw error; }
}
