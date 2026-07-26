import { Link, useParams } from "react-router-dom";
import { PageShell } from "@/components/PageShell";
import { usePosts } from "@/hooks/usePosts";

export default function Categories() {
  const { cat } = useParams();
  const { categories, posts } = usePosts();

  const filtered = cat
    ? posts.filter((p) => p.category === decodeURIComponent(cat))
    : [];

  return (
    <PageShell>
      <div className="article-content-container">
        <h1 className="text-3xl font-bold mb-6 text-first-text">
          {cat ? `分类：${decodeURIComponent(cat)}` : "分类"}
        </h1>

        <ul className="category-list-content flex flex-col gap-2 mb-8">
          {categories.map((c) => (
            <li
              key={c.name}
              className={`flex items-center justify-between px-4 py-2 rounded-redefine-small shadow-redefine-flat hover:shadow-redefine-flat-hover transition-shadow ${
                c.name === decodeURIComponent(cat || "") ? "ring-2 ring-primary" : ""
              }`}
            >
              <Link to={`/categories/${encodeURIComponent(c.name)}`} className="font-semibold hover:text-primary">
                {c.name}
              </Link>
              <span className="text-sm text-third-text">{c.count} 篇</span>
            </li>
          ))}
        </ul>

        {cat && (
          <div>
            <h2 className="text-xl font-semibold mb-4">
              「{decodeURIComponent(cat)}」下的文章
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
                <p className="text-third-text py-4">这个分类下暂时没有文章。</p>
              )}
            </ul>
          </div>
        )}
      </div>
    </PageShell>
  );
}
