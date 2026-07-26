import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { getPost, isOnlinePost } from "@/hooks/usePosts";
import type { Post } from "@/hooks/usePosts";
import { getPost as getApiPost } from "@/lib/api";
import { renderMarkdown, extractToc, type TocItem } from "@/lib/markdown";
import { useImageViewer } from "@/components/ImageViewer";
import { ArticleInteractions } from "@/components/ArticleInteractions";

export default function PostDetail() {
  const { slug = "" } = useParams();
  const viewer = useImageViewer();
  const bodyRef = useRef<HTMLDivElement>(null);
  const [activeId, setActiveId] = useState<string>("");
  const [post, setPost] = useState<Post | null>(getPost(slug) || null);
  const [loading, setLoading] = useState(!getPost(slug));

  useEffect(() => {
    let active = true;
    const staticPost = getPost(slug);
    if (staticPost) {
      setPost(staticPost);
      setLoading(false);
      return;
    }
    // online post: fetch from backend
    if (isOnlinePost(slug)) {
      setLoading(true);
      getApiPost(slug)
        .then((p) => {
          if (!active) return;
          setPost({
            slug: p.slug,
            title: p.title,
            date: p.date || new Date().toISOString(),
            excerpt: p.excerpt,
            category: p.category,
            tags: p.tags,
            body: p.body,
            published: true,
            sortOrder: 0,
            source: "online",
          });
          setLoading(false);
        })
        .catch(() => {
          if (active) {
            setPost(null);
            setLoading(false);
          }
        });
    }
    return () => {
      active = false;
    };
  }, [slug]);

  const html = useMemo(
    () => (post ? renderMarkdown(post.body) : ""),
    [post]
  );
  const toc = useMemo<TocItem[]>(
    () => (post ? extractToc(post.body) : []),
    [post]
  );

  useEffect(() => {
    const root = bodyRef.current;
    if (!root) return;
    const imgs = root.querySelectorAll("img[data-viewer]");
    const handlers: Array<[Element, () => void]> = [];
    imgs.forEach((img) => {
      const h = () => viewer.show((img as HTMLImageElement).src);
      img.addEventListener("click", h);
      handlers.push([img, h]);
    });
    const headings = root.querySelectorAll("h2, h3");
    const obs = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) setActiveId((e.target as HTMLElement).id);
        }
      },
      { rootMargin: "-80px 0px -70% 0px" }
    );
    headings.forEach((h) => obs.observe(h));
    return () => {
      handlers.forEach(([img, h]) => img.removeEventListener("click", h));
      obs.disconnect();
    };
  }, [html, viewer]);

  if (loading) {
    return (
      <div className="main-content-container !pt-[140px]">
        <div className="text-center text-third-text py-20">正在加载文章</div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="main-content-container flex flex-col items-center justify-center min-h-[70vh]">
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-4">文章不存在</h1>
          <Link to="/" className="text-primary hover:underline">
            ← 返回首页
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="main-content-container !pt-[140px]">
      <motion.div
        className="main-content-body flex flex-row flex-wrap justify-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
      >
        {toc.length > 1 && (
          <aside className="hidden lg:block w-[210px] ml-[38px] sticky top-[90px] self-start">
            <div className="p-4 rounded-redefine shadow-redefine-flat bg-background">
              <div className="text-xs font-semibold uppercase text-third-text mb-3">
                目录
              </div>
              <ul className="flex flex-col gap-1.5 text-sm">
                {toc.map((t) => (
                  <li
                    key={t.id}
                    className={`toc-item cursor-pointer transition-colors ${
                      t.level === 3 ? "pl-3" : ""
                    } ${activeId === t.id ? "text-primary font-semibold" : "text-third-text hover:text-primary"}`}
                  >
                    <a href={`#${t.id}`}>{t.text}</a>
                  </li>
                ))}
              </ul>
            </div>
          </aside>
        )}

        <div className="main-content max-w-[760px]">
          <div className="home-content-container">
            <article className="article-content-container">
              <h1 className="article-title">{post.title}</h1>
              <div className="article-meta-info">
                <span className="article-meta-item">
                  <i className="fa-regular fa-user" />
                  {post.category}
                </span>
                <span className="article-meta-item">
                  <i className="fa-regular fa-calendar" />
                  {post.date.slice(0, 10)}
                </span>
                <span className="article-meta-item">
                  <i className="fa-regular fa-folder" />
                  <Link to={`/categories/${encodeURIComponent(post.category)}`}>
                    {post.category}
                  </Link>
                </span>
                {post.tags.map((t) => (
                  <span key={t} className="article-meta-item">
                    <i className="fa-regular fa-tag" />
                    <Link to={`/tags/${encodeURIComponent(t)}`}>{t}</Link>
                  </span>
                ))}
              </div>

              <div
                className="markdown-body"
                ref={bodyRef}
                dangerouslySetInnerHTML={{ __html: html }}
              />

              <ArticleInteractions slug={post.slug} />
            </article>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
