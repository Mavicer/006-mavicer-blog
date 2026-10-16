import { createHash } from "node:crypto";
import catalog from "../generated/static-posts.json";
import { parseArticle, plainToMarkdown, serializeArticle } from "../shared/articles";
import { requireUser } from "./auth";
import { HttpError, json, readBody, rateLimit, type Context } from "./http";
import { github, readArticleFile, GithubError, boundedJson, ARTICLE_DIRECTORY, REPOSITORY, PRODUCTION_ORIGIN, validSlug } from "./github";

type Job = {
  id: string; owner_id: string; slug: string; file_path: string; action: string;
  base_sha: string; file_sha: string; payload_hash: string; content: string;
  commit_sha: string; state: string; error: string; created_at: number; checked_at: number;
};
const now = () => Math.floor(Date.now() / 1000);
const digest = (text: string) => createHash("sha256").update(text).digest("hex");
const blobSha = (text: string) => createHash("sha1").update(`blob ${Buffer.byteLength(text)}\0`).update(text).digest("hex");
const filePath = (slug: string) => ARTICLE_DIRECTORY + (catalog.find((p) => p.slug === slug)?.file || `${slug}.md`);

async function ensurePublishing(ctx: Context): Promise<void> {
  await ctx.env.DB.batch([
    ctx.env.DB.prepare(`CREATE TABLE IF NOT EXISTS article_publish_job (
      id TEXT PRIMARY KEY, owner_id TEXT NOT NULL, slug TEXT NOT NULL, file_path TEXT NOT NULL,
      action TEXT NOT NULL, base_sha TEXT NOT NULL, file_sha TEXT NOT NULL, payload_hash TEXT NOT NULL,
      content TEXT NOT NULL, commit_sha TEXT NOT NULL DEFAULT '', state TEXT NOT NULL DEFAULT 'queued',
      error TEXT NOT NULL DEFAULT '', created_at INTEGER NOT NULL, checked_at INTEGER NOT NULL DEFAULT 0)`),
    ctx.env.DB.prepare(`CREATE TABLE IF NOT EXISTS article_publish_lock (id INTEGER PRIMARY KEY, lease TEXT NOT NULL, expires_at INTEGER NOT NULL)`),
  ]);
}
function view(job: Job) {
  return { id: job.id, slug: job.slug, state: job.state, error: job.error,
    commit_sha: job.commit_sha, file_sha: job.file_sha, article_url: `${PRODUCTION_ORIGIN}/posts/${encodeURIComponent(job.slug)}`,
    commit_url: job.commit_sha ? `https://github.com/${REPOSITORY}/commit/${job.commit_sha}` : "" };
}
async function updateJob(ctx: Context, job: Job, state: string, error = "", commit = job.commit_sha): Promise<void> {
  await ctx.env.DB.prepare(`UPDATE article_publish_job SET state = ?, error = ?, commit_sha = ?, checked_at = ? WHERE id = ?`)
    .bind(state, error, commit, now(), job.id).run();
  Object.assign(job, { state, error, commit_sha: commit, checked_at: now() });
}
function text(value: unknown, name: string, max: number, required = true): string {
  if (typeof value !== "string" || value.length > max || (required && !value.trim())) throw new HttpError(422, `${name}不能为空或超过长度限制`);
  return value.trim();
}
function makeContent(body: Record<string, unknown>, slug: string, original = ""): string {
  const title = text(body.title, "标题", 200);
  text(body.body, "正文", 100_000);
  const source = body.body as string;
  if (body.mode !== "plain" && body.mode !== "markdown") throw new HttpError(422, "请选择纯文本或 Markdown 格式");
  const category = text(body.category, "分类", 40);
  const excerpt = text(body.excerpt ?? "", "摘要", 600, false);
  if (!Array.isArray(body.tags) || body.tags.length > 12 || body.tags.some((tag) => typeof tag !== "string" || !tag.trim() || tag.length > 40)) throw new HttpError(422, "标签格式无效，每个标签最多 40 字");
  const data: Record<string, unknown> = original ? parseArticle(original).data : {};
  const content = serializeArticle({ ...data, title, slug, date: data.date || new Date().toISOString().slice(0, 10),
    category, tags: [...new Set((body.tags as string[]).map((tag) => tag.trim()))],
    excerpt: excerpt || source.replace(/\s+/g, " ").slice(0, 150), published: true, sort_order: data.sort_order ?? 10 },
    body.mode === "plain" ? plainToMarkdown(source) : source);
  if (Buffer.byteLength(content) > 400_000) throw new HttpError(413, "文章内容过长");
  return content;
}

async function recover(ctx: Context, job: Job): Promise<void> {
  const file = await readArticleFile(ctx, job.file_path);
  if (file?.sha === job.file_sha) {
    const commits = await github<Array<{ sha: string; commit: { message: string } }>>(ctx,
      `commits?sha=main&path=${encodeURIComponent(job.file_path)}&per_page=10`);
    const match = commits.find((commit) => commit.commit.message.includes(`[blog:${job.id}]`));
    if (match) await updateJob(ctx, job, "submitted", "", match.sha);
    else await updateJob(ctx, job, "uncertain", "文件已更新，正在核实提交记录；请勿重复发布");
  } else if (now() - job.created_at >= 30 && (file?.sha || "") === job.base_sha) {
    await updateJob(ctx, job, "queued", "未找到已提交的更改，可以安全重试此次发布");
  } else if ((file?.sha || "") !== job.base_sha) {
    await updateJob(ctx, job, "failed", "文章已被其他更改更新，请重新打开编辑页面核对");
  }
}

async function refreshJob(ctx: Context, job: Job): Promise<Job> {
  if (job.state === "published" || (job.state === "failed" && !job.commit_sha) || now() - job.checked_at < 5) return job;
  try {
    if (["submitting", "uncertain"].includes(job.state)) await recover(ctx, job);
    if (!job.commit_sha) return job;
    // This marker comes from the PUBLIC deployment, not a successful Git push.
    // A later deploy also counts if it contains this exact article version.
    try {
    const response = await fetch(`${PRODUCTION_ORIGIN}/_publication.json?job=${job.id}&t=${now()}`, {
      signal: AbortSignal.timeout(5000), headers: { "Cache-Control": "no-cache" },
    });
    if (response.ok && response.headers.get("Content-Type")?.includes("json")) {
      const marker = await boundedJson<{ articles?: Array<{ slug: string; sha: string }> }>(response);
      if (marker.articles?.some((article) => article.slug === job.slug && article.sha === job.file_sha)) {
        await updateJob(ctx, job, "published"); return job;
      }
    } else await response.body?.cancel();
    } catch { /* Still inspect GitHub checks if the public site is unavailable. */ }
    const checks = await github<{ check_runs: Array<{ name: string; status: string; conclusion: string | null }> }>(ctx,
      `commits/${job.commit_sha}/check-runs`);
    const check = checks.check_runs.find((run) => run.name === "Cloudflare Pages");
    if (check?.status === "completed" && check.conclusion !== "success") await updateJob(ctx, job, "failed", "更改已提交 GitHub，但 Cloudflare 部署失败。请查看提交检查记录");
    else await updateJob(ctx, job, check?.status === "in_progress" ? "building" : "submitted",
      check?.conclusion === "success" ? "部署完成，正在等待正式站版本可见" : "");
  } catch (error) {
    // A status-check outage must never turn a submitted write into a retry.
    await ctx.env.DB.prepare(`UPDATE article_publish_job SET checked_at = ? WHERE id = ?`).bind(now(), job.id).run();
    job.error = error instanceof HttpError ? error.message : "部署状态暂时无法读取，请稍后再次检查";
  }
  return job;
}

async function submit(ctx: Context, job: Job): Promise<Job> {
  if (job.state !== "queued") return refreshJob(ctx, job);
  const lease = crypto.randomUUID();
  const lock = await ctx.env.DB.prepare(`INSERT INTO article_publish_lock (id, lease, expires_at) VALUES (1, ?, ?)
    ON CONFLICT(id) DO UPDATE SET lease = excluded.lease, expires_at = excluded.expires_at WHERE expires_at <= ? RETURNING lease`)
    .bind(lease, now() + 60, now()).first();
  if (!lock) throw new HttpError(409, "另一项发布正在处理中，请稍后重试；当前编辑内容已保留");
  let uncertain = false;
  try {
    // Recheck under the lease: a double click may have waited behind this job.
    const fresh = await ctx.env.DB.prepare(`SELECT * FROM article_publish_job WHERE id = ?`).bind(job.id).first<Job>();
    if (!fresh || fresh.state !== "queued") return fresh || job;
    const file = await readArticleFile(ctx, job.file_path);
    if ((file?.sha || "") !== job.base_sha) { await updateJob(ctx, job, "failed", "文章版本已变化，请重新加载后再发布"); return job; }
    await updateJob(ctx, job, "submitting");
    const result = await github<{ commit: { sha: string } }>(ctx, `contents/${job.file_path}`, {
      method: "PUT", body: JSON.stringify({ branch: "main", content: Buffer.from(job.content).toString("base64"),
        ...(job.base_sha ? { sha: job.base_sha } : {}), message: `[blog:${job.id}] ${job.action === "create" ? "Publish" : "Edit"}: ${job.slug}` }),
    });
    await updateJob(ctx, job, "submitted", "", result.commit.sha);
    return job;
  } catch (error) {
    uncertain = error instanceof GithubError && !error.definitive;
    if (String(job.state) === "submitting" && !(error instanceof GithubError)) uncertain = true;
    await updateJob(ctx, job, uncertain ? "uncertain" : "failed",
      error instanceof HttpError ? error.message : "发布结果暂时无法确认，正在核实 GitHub 提交");
    return job;
  } finally {
    if (!uncertain) await ctx.env.DB.prepare(`DELETE FROM article_publish_lock WHERE id = 1 AND lease = ?`).bind(lease).run();
  }
}

export async function publishingRoute(ctx: Context, path: string): Promise<Response | null> {
  if (!path.startsWith("admin/publishing") && !path.startsWith("admin/content")) return null;
  const user = await requireUser(ctx);
  if (!user.is_owner) throw new HttpError(403, "需要管理员权限");
  if (path === "admin/publishing/config" && ctx.request.method === "GET") return json({ configured: !!ctx.env.GITHUB_PUBLISH_TOKEN, repository: REPOSITORY });
  const article = path.match(/^admin\/content\/([^/]+)$/);
  if (article && ctx.request.method === "GET") {
    const slug = decodeURIComponent(article[1]);
    if (!validSlug(slug)) throw new HttpError(422, "文章地址格式无效");
    const file = await readArticleFile(ctx, filePath(slug));
    if (!file) throw new HttpError(404, "GitHub 中未找到文章");
    const parsed = parseArticle(Buffer.from(file.content, "base64").toString("utf8"));
    return json({ slug, sha: file.sha, ...parsed });
  }
  await ensurePublishing(ctx);
  const status = path.match(/^admin\/publishing\/jobs\/([0-9a-f-]{36})$/);
  if (status && ctx.request.method === "GET") {
    const job = await ctx.env.DB.prepare(`SELECT * FROM article_publish_job WHERE id = ? AND owner_id = ?`).bind(status[1], user.id).first<Job>();
    if (!job) throw new HttpError(404, "发布记录不存在");
    return json(view(await refreshJob(ctx, job)));
  }
  if (path !== "admin/publishing" || ctx.request.method !== "POST") throw new HttpError(404, "接口不存在");
  if (!ctx.env.GITHUB_PUBLISH_TOKEN) throw new HttpError(503, "发布服务尚未配置 GitHub 凭据，请联系博主完成配置");
  const body = await readBody(ctx.request, 512_000);
  const id = text(body.request_id, "请求编号", 36);
  const slug = text(body.slug, "文章地址", 100);
  if (!/^[0-9a-f-]{36}$/.test(id) || !validSlug(slug) || !["create", "update"].includes(String(body.action))) throw new HttpError(422, "发布参数格式无效");
  const payloadHash = digest(JSON.stringify([body.action, slug, body.sha || "", body.title, body.category, body.tags, body.excerpt || "", body.mode, body.body]));
  const previous = await ctx.env.DB.prepare(`SELECT * FROM article_publish_job WHERE id = ?`).bind(id).first<Job>();
  if (previous) {
    if (previous.owner_id !== user.id || previous.payload_hash !== payloadHash) throw new HttpError(409, "请求编号已用于其他内容，请重新开始发布");
    return json(view(await submit(ctx, previous)));
  }
  await rateLimit(ctx, "publish", user.id, 30, 3600);
  const pathToFile = filePath(slug);
  const original = await readArticleFile(ctx, pathToFile);
  if (body.action === "create" && original) throw new HttpError(409, "文章地址已经存在，请更换地址");
  if (body.action === "update" && (!original || body.sha !== original.sha)) throw new HttpError(409, "文章版本已变化，请重新加载后再发布");
  const content = makeContent(body, slug, original ? Buffer.from(original.content, "base64").toString("utf8") : "");
  const job: Job = { id, owner_id: user.id, slug, file_path: pathToFile, action: String(body.action), base_sha: original?.sha || "",
    file_sha: blobSha(content), payload_hash: payloadHash, content, commit_sha: "", state: "queued", error: "", created_at: now(), checked_at: 0 };
  await ctx.env.DB.prepare(`INSERT OR IGNORE INTO article_publish_job (id, owner_id, slug, file_path, action, base_sha, file_sha, payload_hash, content, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    .bind(job.id, user.id, slug, pathToFile, job.action, job.base_sha, job.file_sha, payloadHash, content, job.created_at).run();
  const stored = await ctx.env.DB.prepare(`SELECT * FROM article_publish_job WHERE id = ?`).bind(id).first<Job>();
  if (!stored || stored.owner_id !== user.id || stored.payload_hash !== payloadHash) throw new HttpError(409, "发布请求冲突");
  return json(view(await submit(ctx, stored)), 202);
}
