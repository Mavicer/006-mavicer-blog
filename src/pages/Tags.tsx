import { Link, useParams } from "react-router-dom";
import { PageShell } from "@/components/PageShell";
import { usePosts } from "@/hooks/usePosts";

export default function Tags() {
  const { tag } = useParams();
  const { tags, posts } = usePosts();

  const filtered = tag
    ? posts.filter((p) => p.tags.includes(decodeURIComponent(tag)))
    : [];

  return (
    <PageShell>
      <div className="article-content-container">
        <h1 className="text-3xl font-bold mb-6 text-first-text">
          {tag ? `标签：${decodeURIComponent(tag)}` : "标签"}
        </h1>

        <div className="tagcloud mb-6">
          <div className="tag-list">
            {tags.map((t) => (
              <Link
                key={t.name}
                to={`/tags/${encodeURIComponent(t.name)}`}
                className={t.name === decodeURIComponent(tag || "") ? "active !text-primary !border-primary" : ""}
              >
                <i className="fa-solid fa-hashtag" />
                {t.name}
                <span className="ml-1 text-sm opacity-70">{t.count}</span>
              </Link>
            ))}
          </div>
        </div>

        {tag && (
          <div>
            <h2 className="text-xl font-semibold mb-4">
              「{decodeURIComponent(tag)}」下的文章
            </h2>
            <ul className="article-list pl-0 md:pl-8">
              {filtered.map((p) => (
                <li
                  key={p.slug}
                  className="article-item px-6 py-3 border-l-2 border-border"
                >
                  <Link to={`/posts/${p.slug}`} className="font-semibold hover:text-primary">
                    {p.title}
                  </Link>
                  <span className="ml-3 text-sm text-third-text">
                    {p.date.slice(0, 10)}
                  </span>
                </li>
              ))}
              {filtered.length === 0 && (
                <p className="text-third-text py-4">这个标签下暂时没有文章。</p>
              )}
            </ul>
          </div>
        )}
      </div>
    </PageShell>
  );
}
