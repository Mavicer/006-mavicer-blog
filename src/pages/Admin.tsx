import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { PageShell } from "@/components/PageShell";
import { useAuth } from "@/hooks/useAuth";
import {
  listAllArticles,
  getArticle,
  createArticle,
  updateArticle,
  deleteArticle,
  type Article,
  type ArticleInput,
} from "@/services/articlesService";
import { renderMarkdown } from "@/lib/markdown";

const emptyForm: ArticleInput & { editing_slug: string; tagsText: string } = {
  editing_slug: "",
  slug: "",
  title: "",
  excerpt: "",
  category: "",
  tags: [],
  tagsText: "",
  body: "",
  cover: "",
  published: true,
  sortOrder: 10,
};

export default function Admin() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [articles, setArticles] = useState<Article[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [status, setStatus] = useState("正在加载管理控制台");
  const [preview, setPreview] = useState(false);

  const load = () => {
    const list = listAllArticles();
    setArticles(list);
    if (list.length) {
      const maxSort = Math.max(...list.map((x) => x.sortOrder ?? 0)) + 10;
      setForm((f) => ({ ...f, sortOrder: maxSort }));
    }
    setStatus(user ? "已登录" : "请先登录");
  };

  useEffect(() => {
    if (!user) {
      navigate("/login?next=/admin");
      return;
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload: ArticleInput = {
      slug: form.slug,
      title: form.title,
      excerpt: form.excerpt,
      category: form.category,
      tags: form.tagsText
        .split(/[,，]/)
        .map((t) => t.trim())
        .filter(Boolean),
      body: form.body,
      cover: form.cover,
      published: form.published,
      sortOrder: Number(form.sortOrder),
    };
    setStatus("正在保存文章...");
    try {
      if (form.editing_slug) {
        updateArticle(form.editing_slug, payload);
      } else {
        createArticle(payload);
      }
      load();
      setStatus("文章已保存。");
      setForm((f) => ({ ...emptyForm, sortOrder: form.sortOrder }));
    } catch (err: any) {
      setStatus(
        err?.status === 409
          ? "文章地址已存在。"
          : `保存失败：${err?.message || "请检查输入"}`
      );
    }
  };

  const edit = (slug: string) => {
    const p = getArticle(slug);
    if (!p) return;
    setForm({
      editing_slug: p.slug,
      slug: p.slug,
      title: p.title,
      excerpt: p.excerpt,
      category: p.category,
      tags: p.tags,
      tagsText: p.tags.join(", "),
      body: p.body,
      cover: p.cover || "",
      published: p.published,
      sortOrder: p.sortOrder ?? 10,
    });
    setPreview(false);
  };

  const remove = (slug: string) => {
    if (!window.confirm("删除这篇文章？")) return;
    deleteArticle(slug);
    load();
  };

  if (!user) {
    return (
      <PageShell showSidebar={false}>
        <div className="article-content-container max-w-[480px] mx-auto text-center">
          <p className="mb-4">{status}</p>
          <Link to="/login?next=/admin" className="text-primary hover:underline">
            登录
          </Link>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell showSidebar={false}>
      <div className="article-content-container max-w-[980px] mx-auto">
        <p className="text-third-text mb-4">{status}</p>

        <form onSubmit={onSubmit} className="aleph-form flex flex-col gap-4 mb-8">
          <input type="hidden" value={form.editing_slug} readOnly />
          <label className="flex flex-col gap-1 font-bold">
            <span className="text-sm">文章地址 (slug)</span>
            <input
              required
              pattern="[a-z0-9][a-z0-9-]*"
              value={form.slug}
              onChange={(e) => setForm({ ...form, slug: e.target.value })}
              placeholder="my-first-post"
              className="px-3 py-2 rounded-md border border-border bg-background font-normal"
            />
          </label>
          <label className="flex flex-col gap-1 font-bold">
            <span className="text-sm">标题</span>
            <input
              required
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="px-3 py-2 rounded-md border border-border bg-background font-normal"
            />
          </label>
          <label className="flex flex-col gap-1 font-bold">
            <span className="text-sm">封面图 URL（可选）</span>
            <input
              value={form.cover}
              onChange={(e) => setForm({ ...form, cover: e.target.value })}
              placeholder="https://..."
              className="px-3 py-2 rounded-md border border-border bg-background font-normal"
            />
          </label>
          <label className="flex flex-col gap-1 font-bold">
            <span className="text-sm">摘要</span>
            <input
              value={form.excerpt}
              onChange={(e) => setForm({ ...form, excerpt: e.target.value })}
              className="px-3 py-2 rounded-md border border-border bg-background font-normal"
            />
          </label>
          <div className="flex gap-4">
            <label className="flex flex-col gap-1 font-bold flex-1">
              <span className="text-sm">分类</span>
              <input
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                className="px-3 py-2 rounded-md border border-border bg-background font-normal"
              />
            </label>
            <label className="flex flex-col gap-1 font-bold flex-1">
              <span className="text-sm">标签（逗号分隔）</span>
              <input
                value={form.tagsText}
                onChange={(e) => setForm({ ...form, tagsText: e.target.value })}
                className="px-3 py-2 rounded-md border border-border bg-background font-normal"
              />
            </label>
          </div>
          <div className="flex gap-4 items-center">
            <label className="flex items-center gap-2 font-bold">
              <input
                type="checkbox"
                checked={form.published}
                onChange={(e) => setForm({ ...form, published: e.target.checked })}
              />
              <span className="text-sm">发布</span>
            </label>
            <label className="flex items-center gap-2 font-bold">
              <span className="text-sm">排序</span>
              <input
                type="number"
                value={form.sortOrder}
                onChange={(e) => setForm({ ...form, sortOrder: Number(e.target.value) })}
                className="w-24 px-3 py-2 rounded-md border border-border bg-background font-normal"
              />
            </label>
          </div>

          <div className="flex gap-2 mb-2">
            <button
              type="button"
              onClick={() => setPreview(false)}
              className={`px-3 py-1 rounded-md border border-border ${!preview ? "text-primary font-bold border-primary" : ""}`}
            >
              编辑
            </button>
            <button
              type="button"
              onClick={() => setPreview(true)}
              className={`px-3 py-1 rounded-md border border-border ${preview ? "text-primary font-bold border-primary" : ""}`}
            >
              预览
            </button>
          </div>

          {preview ? (
            <div
              className="markdown-body min-h-[220px] p-4 rounded-md border border-border bg-third-background"
              dangerouslySetInnerHTML={{ __html: renderMarkdown(form.body) }}
            />
          ) : (
            <textarea
              required
              value={form.body}
              onChange={(e) => setForm({ ...form, body: e.target.value })}
              placeholder="在这里写 Markdown..."
              className="min-h-[220px] px-3 py-2 rounded-md border border-border bg-background font-mono text-sm"
            />
          )}

          <div className="flex gap-3">
            <button
              type="submit"
              className="px-4 py-2 rounded-md bg-primary text-white font-semibold"
            >
              <i className="fa-regular fa-floppy-disk" />{" "}
              {form.editing_slug ? "更新文章" : "保存文章"}
            </button>
            <button
              type="button"
              onClick={() => setForm({ ...emptyForm, sortOrder: form.sortOrder })}
              className="px-4 py-2 rounded-md border border-border font-semibold"
            >
              <i className="fa-regular fa-file" /> 新建
            </button>
          </div>
        </form>

        <section>
          <h2 className="text-xl font-bold mb-3 text-first-text">文章列表</h2>
          <div className="flex flex-col gap-3">
            {articles.length === 0 && (
              <p className="text-third-text text-sm">暂无文章，先在上方创建一篇。</p>
            )}
            {articles.map((p) => (
              <article
                key={p.slug}
                className="p-3 rounded-redefine-small border border-border bg-background"
              >
                <strong>{p.title}</strong>
                <p className="text-xs text-third-text mt-1">
                  {p.slug} · {p.category} · {p.tags.join(", ")} · 排序 {p.sortOrder} ·{" "}
                  {p.published ? "已发布" : "草稿"}
                </p>
                <div className="flex gap-2 mt-2">
                  <button
                    onClick={() => edit(p.slug)}
                    className="px-2 py-1 rounded border border-border text-sm hover:text-primary"
                  >
                    <i className="fa-regular fa-pen-to-square" /> 编辑
                  </button>
                  <button
                    onClick={() => remove(p.slug)}
                    className="px-2 py-1 rounded border border-border text-sm hover:text-primary"
                  >
                    <i className="fa-regular fa-trash-can" /> 删除
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>
    </PageShell>
  );
}
