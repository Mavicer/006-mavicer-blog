import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { PageShell } from "@/components/PageShell";
import { useAuth } from "@/hooks/useAuth";
import { plainToMarkdown } from "../../shared/articles";
import { renderMarkdown } from "@/lib/markdown";
import * as api from "@/lib/api";

type Form = { title: string; slug: string; category: string; tags: string; excerpt: string; body: string; mode: "plain" | "markdown"; sha: string };
const labels: Record<string, string> = { queued: "等待提交，可点击重试", submitting: "正在提交 GitHub…", uncertain: "正在核实提交结果，请勿重复发布", submitted: "已提交 GitHub，等待部署", building: "Cloudflare 正在部署", published: "已上线，公众可见", failed: "发布未完成" };
const pending = (job: api.PublishJob | null) => !!job && ["submitting", "uncertain", "submitted", "building"].includes(job.state);

export default function ArticleEditor() {
  const { slug } = useParams();
  const { user } = useAuth();
  const key = `MAVICER_EDITOR_DRAFT:${user!.id}:${slug || "new"}`;
  const [form, setForm] = useState<Form>(() => ({ title: "", slug: slug || `post-${new Date().toISOString().slice(0, 10)}-${crypto.randomUUID().slice(0, 6)}`, category: "随笔", tags: "", excerpt: "", body: "", mode: slug ? "markdown" : "plain", sha: "" }));
  const [configured, setConfigured] = useState(false);
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [preview, setPreview] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [job, setJob] = useState<api.PublishJob | null>(null);
  const [checking, setChecking] = useState(false);
  const [autoCheck, setAutoCheck] = useState(true);
  const [busy, setBusy] = useState(false);
  const requestId = useRef("");
  const loadedOnce = useRef(false);
  const markdown = useMemo(() => form.mode === "plain" ? plainToMarkdown(form.body) : form.body, [form.body, form.mode]);
  const html = useMemo(() => renderMarkdown(markdown), [markdown]);

  const load = async (restore = true) => {
    setLoading(true); setError("");
    try {
      const config = await api.publishingConfig(); setConfigured(config.configured);
      if (slug) {
        const article = await api.editorArticle(slug);
        setForm({ title: String(article.data.title || slug), slug, category: String(article.data.category || "随笔"),
          tags: Array.isArray(article.data.tags) ? article.data.tags.join("，") : "", excerpt: String(article.data.excerpt || ""), body: article.body, mode: "markdown", sha: article.sha });
      }
      setReady(true);
      if (restore) {
        try {
          const draft = JSON.parse(localStorage.getItem(key) || "null");
          if (draft?.form && typeof draft.form.body === "string" && (!slug || draft.form.slug === slug)) {
            setForm(draft.form); setDirty(true); setNotice("已恢复本机草稿，发布时会核对 GitHub 原版本。");
            if (draft.job?.id) { setJob(draft.job); requestId.current = draft.job.id; }
          }
        } catch { /* Blocked storage does not disable editing. */ }
      } else { setDirty(false); setJob(null); requestId.current = ""; setNotice("已重新载入 GitHub 最新版本。"); }
    } catch (e: any) { setError(e.message); setReady(false); }
    finally { setLoading(false); }
  };
  useEffect(() => { if (!loadedOnce.current) { loadedOnce.current = true; void load(); } }, []);
  useEffect(() => {
    if (!ready || job?.state === "published" || (!dirty && !job)) return;
    try { localStorage.setItem(key, JSON.stringify({ form, job })); }
    catch { setNotice("本机暂存不可用，请保持页面打开，避免丢失未发布内容。"); }
  }, [form, job, dirty, ready, key]);
  useEffect(() => {
    if (!dirty) return;
    const beforeUnload = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; };
    const beforeLink = (event: MouseEvent) => {
      const link = (event.target as Element).closest?.("a");
      if (link && !link.target && !link.href.endsWith("#") && !window.confirm("编辑内容尚未发布，确定离开？本机草稿会保留。")) { event.preventDefault(); event.stopPropagation(); }
    };
    window.addEventListener("beforeunload", beforeUnload); document.addEventListener("click", beforeLink, true);
    return () => { window.removeEventListener("beforeunload", beforeUnload); document.removeEventListener("click", beforeLink, true); };
  }, [dirty]);

  const applyJob = (next: api.PublishJob) => {
    setJob(next);
    if (next.state === "published") {
      if (slug) setForm((previous) => ({ ...previous, sha: next.file_sha }));
      setDirty(false); setNotice("本次文章版本已在正式站可见。");
      try { localStorage.removeItem(key); } catch { /* no persistent draft */ }
    }
  };
  const check = async () => {
    if (!job || checking) return;
    setChecking(true);
    try { applyJob(await api.publishJob(job.id)); setError(""); }
    catch (e: any) { setError(e.message); }
    finally { setChecking(false); }
  };
  useEffect(() => {
    if (!pending(job) || !autoCheck) return;
    let active = true;
    const started = Date.now();
    const timer = window.setInterval(async () => {
      if (Date.now() - started > 120000) { setAutoCheck(false); return; }
      try { const next = await api.publishJob(job!.id); if (active) applyJob(next); } catch { /* Manual check remains available. */ }
    }, 8000);
    return () => { active = false; window.clearInterval(timer); };
  }, [job?.id, job?.state, autoCheck]);

  const change = (field: keyof Form, value: string) => {
    setForm((previous) => ({ ...previous, [field]: value })); setDirty(true); setError("");
    if (!pending(job)) { setJob(null); requestId.current = ""; }
  };
  const publish = async (event: React.FormEvent) => {
    event.preventDefault(); if (busy || pending(job)) return;
    if (job?.state === "failed") requestId.current = "";
    const id = requestId.current || crypto.randomUUID(); requestId.current = id;
    setBusy(true); setError(""); setAutoCheck(true);
    try {
      applyJob(await api.publishArticle({ ...form, action: slug ? "update" : "create", request_id: id,
        tags: form.tags.split(/[,，]/).map((tag) => tag.trim()).filter(Boolean) }));
    } catch (e: any) {
      // The response can be lost after GitHub has already accepted the commit.
      try { applyJob(await api.publishJob(id)); } catch { setError(e.message); }
    } finally { setBusy(false); }
  };
  const frozen = busy || pending(job) || (!slug && job?.state === "published");
  const inputClass = "px-3 py-2 rounded-md border border-border bg-background font-normal";
  return <PageShell showSidebar={false}><div className="article-content-container max-w-[1000px] mx-auto">
    <div className="flex flex-wrap gap-4 items-center justify-between mb-4"><h1 className="text-3xl font-bold">{slug ? "编辑文章" : "发布文章"}</h1><Link to="/admin" className="text-primary">文章管理</Link></div>
    <p className="mb-4 text-third-text">在这里编辑、预览并发布，完成部署后所有访客都能看到。</p>
    {loading && <p role="status">正在读取 GitHub 文章与发布配置…</p>}
    {!loading && !configured && <p role="alert" className="mb-4 text-primary">发布服务尚未连接 GitHub。请完成服务器凭据配置后重试。</p>}
    {error && <p role="alert" className="my-4 text-primary">{error}</p>}
    {notice && <p role="status" className="my-4 text-third-text">{notice}</p>}
    {!loading && !ready && <button onClick={() => void load()}>重新加载</button>}
    {job && <section className="border border-border rounded-md p-4 mb-6" aria-label="发布状态">
      <p role="status" className="font-bold">{labels[job.state] || job.state}</p>
      {job.error && <p className="my-2">{job.error}</p>}
      <div className="flex flex-wrap gap-4 mt-3">
        {job.commit_url && <a className="text-primary" href={job.commit_url} target="_blank" rel="noreferrer">查看 GitHub 提交</a>}
        {job.state === "published" && <a className="text-primary" href={job.article_url} target="_blank" rel="noreferrer">查看已发布文章</a>}
        {job.state === "published" && !slug && <a className="text-primary" href={`/admin/articles/${job.slug}/edit`}>编辑这篇文章</a>}
        {job.state !== "published" && <button disabled={checking} onClick={() => void check()}>{checking ? "检查中…" : "检查发布状态"}</button>}
      </div>
    </section>}
    <form className="aleph-form flex flex-col gap-4" onSubmit={publish}>
      <fieldset disabled={frozen || loading} className="flex flex-col gap-4 min-w-0">
        <label className="flex flex-col gap-1">标题<input required maxLength={200} value={form.title} onChange={(e) => change("title", e.target.value)} className={inputClass} /></label>
        <div className="grid md:grid-cols-2 gap-4">
          <label className="flex flex-col gap-1">文章地址<input required readOnly={!!slug} pattern="[a-z0-9][a-z0-9_-]{0,99}" maxLength={100} value={form.slug} onChange={(e) => change("slug", e.target.value)} className={inputClass} /><small className="text-third-text">英文小写、数字、短横线；已有文章地址保持不变。</small></label>
          <label className="flex flex-col gap-1">分类<input required maxLength={40} value={form.category} onChange={(e) => change("category", e.target.value)} className={inputClass} /></label>
        </div>
        <label className="flex flex-col gap-1">标签（逗号分隔）<input maxLength={400} value={form.tags} onChange={(e) => change("tags", e.target.value)} className={inputClass} /></label>
        <label className="flex flex-col gap-1">摘要（留空自动提取）<textarea maxLength={600} value={form.excerpt} onChange={(e) => change("excerpt", e.target.value)} className={inputClass} /></label>
        <label className="flex flex-col gap-1">正文格式<select value={form.mode} onChange={(e) => change("mode", e.target.value)} className={inputClass}><option value="plain">纯文本：按自然段自动排版</option><option value="markdown">Markdown：保留标题、列表和代码</option></select></label>
        <div className="flex gap-4"><button type="button" className={!preview ? "text-primary font-bold" : ""} onClick={() => setPreview(false)}>编辑正文</button><button type="button" className={preview ? "text-primary font-bold" : ""} onClick={() => setPreview(true)}>预览效果</button></div>
        {preview ? <div className="markdown-body min-h-[360px] border border-border rounded-md p-4" dangerouslySetInnerHTML={{ __html: html }} /> : <label className="flex flex-col gap-1">正文<textarea required maxLength={100000} value={form.body} onChange={(e) => change("body", e.target.value)} placeholder="粘贴正文，每段之间空一行…" className={`${inputClass} min-h-[360px] font-mono text-sm`} /></label>}
      </fieldset>
      <div className="flex flex-wrap gap-4 items-center mt-4">
        <button type="submit" disabled={!ready || !configured || !dirty || frozen || !form.title.trim() || !form.body.trim()} className="px-4 py-2 rounded-md bg-primary text-white font-bold disabled:opacity-50">{busy ? "提交中…" : job?.state === "queued" ? "重试此次发布" : slug ? "发布修改" : "发布文章"}</button>
        {slug && <button type="button" disabled={frozen || loading} onClick={() => { if (!dirty || window.confirm("重新载入会替换当前编辑内容，确定继续？")) void load(false); }}>重新载入 GitHub 版本</button>}
        <span className="text-sm text-third-text">{dirty ? "尚未公开发布" : ""}</span>
      </div>
    </form>
  </div></PageShell>;
}
