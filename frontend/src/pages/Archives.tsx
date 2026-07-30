import { Link } from "react-router-dom";
import { PageShell } from "@/components/PageShell";
import { usePosts } from "@/hooks/usePosts";

function formatDate(iso: string): string {
  return iso.slice(0, 10);
}

export default function Archives() {
  const { posts, loading } = usePosts();

  // group by year, desc
  const groups: Record<string, typeof posts> = {};
  for (const p of posts) {
    const y = String(p.date).slice(0, 4) || "未注明年份";
    (groups[y] ||= []).push(p);
  }
  const years = Object.keys(groups).sort((a, b) => b.localeCompare(a));

  return (
    <PageShell>
      <div className="article-content-container">
        <h1 className="text-3xl font-bold mb-6 text-first-text">归档</h1>
        {loading ? (
          <p className="text-third-text">正在读取归档</p>
        ) : (
          years.map((year) => (
            <section key={year} className="archive-item mb-8">
              <div className="flex flex-row items-center mb-2">
                <span className="archive-year font-semibold text-3xl mr-2">
                  {year}
                </span>
                <span className="archive-year-post-count">
                  {groups[year].length}
                </span>
              </div>
              <ul className="article-list pl-0 md:pl-8 text-lg leading-[1.5]">
                {groups[year].map((p) => (
                  <li
                    key={p.slug}
                    className="article-item space-y-2 px-6 pt-6 pb-2 relative border-l-2 border-border"
                  >
                    <Link to={`/posts/${p.slug}`} className="block w-fit">
                      <span className="article-title my-0.5 text-xl font-semibold hover:text-primary">
                        {p.title}
                      </span>
                    </Link>
                    <div className="aleph-post-taxonomy flex gap-2 items-center flex-wrap">
                      <Link
                        className="aleph-category"
                        to={`/categories/${encodeURIComponent(p.category)}`}
                      >
                        {p.category}
                      </Link>
                      {p.tags.map((t) => (
                        <Link
                          key={t}
                          className="aleph-tag"
                          to={`/tags/${encodeURIComponent(t)}`}
                        >
                          #{t}
                        </Link>
                      ))}
                    </div>
                    <p className="text-sm text-third-text opacity-75 mt-1">
                      {formatDate(p.date)}
                    </p>
                  </li>
                ))}
              </ul>
            </section>
          ))
        )}
      </div>
    </PageShell>
  );
}
