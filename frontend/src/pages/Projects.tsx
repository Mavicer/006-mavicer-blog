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


// Names verified against the public GitHub profile on 2026-10-19.
// Do not invent stars, languages or timestamps when live data is unavailable.
const KNOWN_PROJECTS = ["007-visuallab", "006-mavicer-blog", "005-nexus", "003-travel-website"];

function isRepoList(value: unknown): value is Repo[] {
  return Array.isArray(value) && value.every((repo) =>
    repo && typeof repo.name === "string" &&
    typeof repo.html_url === "string" && repo.html_url.startsWith("https://github.com/Mavicer/") &&
    (repo.description === null || typeof repo.description === "string") &&
    (repo.language === null || typeof repo.language === "string") &&
    typeof repo.stars === "number" && typeof repo.forks === "number" &&
    typeof repo.updated_at === "string" && Array.isArray(repo.topics) &&
    repo.topics.every((topic: unknown) => typeof topic === "string"));
}

export default function Projects() {
  const [repos, setRepos] = useState<Repo[]>([]);
  const [loading, setLoading] = useState(true);

  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    let active = true;
    setLoading(true);
    setError("");
    // Storage is optional: blocked storage must never prevent loading projects.
    try {
      const cached = JSON.parse(localStorage.getItem("mavicer-projects-v1") || "null");
      if (isRepoList(cached)) setRepos(cached);
    } catch { /* Ignore unavailable or corrupted browser storage. */ }

    fetch("/api/projects", { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data: unknown = await response.json();
        if (!isRepoList(data)) throw new Error("Invalid project response");
        if (!active) return;
        const list = [...data].sort((a, b) =>
          parseInt(b.name.match(/^(\d+)/)?.[1] || "0", 10) -
          parseInt(a.name.match(/^(\d+)/)?.[1] || "0", 10));
        setRepos(list);
        try { localStorage.setItem("mavicer-projects-v1", JSON.stringify(list)); }
        catch { /* The current response is still usable without persistence. */ }
      })
      .catch(() => {
        if (active) setError("项目列表暂时无法更新，以下保留已知项目，统计信息可能不是最新。");
      })
      .finally(() => {
        clearTimeout(timeout);
        if (active) setLoading(false);
      });
    return () => {
      active = false;
      clearTimeout(timeout);
      controller.abort();
    };
  }, [attempt]);

  return (
    <PageShell>
      <div className="article-content-container">
        <h1 className="text-4xl font-bold mb-2 text-first-text">Projects</h1>
        <p className="text-third-text mb-8">
          GitHub Repositories — 从 <a href="https://github.com/Mavicer" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">@Mavicer</a> 定期更新。
        </p>

        {error && (
          <div role="status" className="text-third-text mb-6">
            <p>{error}</p>
            <button type="button" onClick={() => setAttempt((value) => value + 1)} className="text-primary underline mt-2">重试</button>
            {repos.length === 0 && (
              <ul className="mt-4 space-y-2">
                {KNOWN_PROJECTS.map((name) => <li key={name}><a className="text-primary hover:underline" href={`https://github.com/Mavicer/${name}`} target="_blank" rel="noopener noreferrer">{name}</a></li>)}
              </ul>
            )}
          </div>
        )}
        {loading ? (
          <p className="text-third-text py-10 text-center">正在加载项目列表...</p>
        ) : error && repos.length === 0 ? null : repos.length === 0 ? (
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
