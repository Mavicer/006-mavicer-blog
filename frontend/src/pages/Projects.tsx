import { useEffect, useState } from "react";
import { PageShell } from "@/components/PageShell";

type Repo = {
  name: string;
  description: string | null;
  html_url: string;
  language: string | null;
  stars: number;
  forks: number;
  topics: string[];
  updated_at: string;
};

export default function Projects() {
  const [repos, setRepos] = useState<Repo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("https://api.github.com/users/Mavicer/repos?sort=updated&per_page=20")
      .then((r) => r.json())
      .then((data: any[]) => {
        const list: Repo[] = (data || [])
          .filter((r) => !r.fork)
          .map((r) => ({
            name: r.name,
            description: r.description,
            html_url: r.html_url,
            language: r.language,
            stars: r.stargazers_count || 0,
            forks: r.forks_count || 0,
            topics: r.topics || [],
            updated_at: r.updated_at,
          }))
          .sort((a, b) => {
          // Sort by leading number prefix (e.g. "003-xxx" → 3), descending.
          const numA = parseInt(a.name.match(/^(\d+)/)?.[1] || "0", 10);
          const numB = parseInt(b.name.match(/^(\d+)/)?.[1] || "0", 10);
          return numB - numA;
        });
        setRepos(list);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  return (
    <PageShell>
      <div className="article-content-container">
        <h1 className="text-4xl font-bold mb-2 text-first-text">Projects</h1>
        <p className="text-third-text mb-8">
          GitHub Repositories — 从 <a href="https://github.com/Mavicer" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">@Mavicer</a> 实时拉取。
        </p>

        {loading ? (
          <p className="text-third-text py-10 text-center">正在加载项目列表...</p>
        ) : repos.length === 0 ? (
          <p className="text-third-text py-10 text-center">暂无公开仓库。</p>
        ) : (
          <div className="flex flex-col gap-4">
            {repos.map((repo) => (
              <a
                key={repo.name}
                href={repo.html_url}
                target="_blank"
                rel="noopener noreferrer"
                className="block p-5 rounded-redefine shadow-redefine-flat hover:shadow-redefine-flat-hover transition-all border border-border hover:border-primary group"
              >
                <div className="flex items-start justify-between gap-4 mb-2">
                  <h2 className="text-xl font-semibold text-first-text group-hover:text-primary transition-colors">
                    {repo.name}
                  </h2>
                  {repo.language && (
                    <span className="shrink-0 text-xs px-2.5 py-1 rounded-full bg-third-background text-third-text border border-border">
                      {repo.language}
                    </span>
                  )}
                </div>
                <p className="text-sm text-third-text mb-3 leading-relaxed">
                  {repo.description || "暂无描述"}
                </p>
                <div className="flex items-center gap-4 text-xs text-third-text">
                  <span className="flex items-center gap-1">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                    </svg>
                    {repo.stars}
                  </span>
                  <span className="flex items-center gap-1">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="6" cy="6" r="3" />
                      <circle cx="6" cy="18" r="3" />
                      <path d="M18 6a3 3 0 0 1 0 6H6" />
                    </svg>
                    {repo.forks}
                  </span>
                  <span>更新于 {repo.updated_at.slice(0, 10).replace(/-/g, "/")}</span>
                </div>
                {repo.topics.length > 0 && (
                  <div className="flex gap-1.5 flex-wrap mt-3">
                    {repo.topics.map((t) => (
                      <span key={t} className="px-2 py-0.5 rounded-full text-[0.65rem] bg-third-background text-third-text border border-border">
                        {t}
                      </span>
                    ))}
                  </div>
                )}
              </a>
            ))}
          </div>
        )}
      </div>
    </PageShell>
  );
}
