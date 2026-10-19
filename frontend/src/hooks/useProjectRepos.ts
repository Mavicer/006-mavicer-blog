import { useEffect, useState } from "react";

export type Repo = {
  name: string;
  description: string | null;
  html_url: string;
  language: string | null;
  stars: number;
  forks: number;
  topics: string[];
  updated_at: string;
};

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

export function useProjectRepos() {
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
        if (active) setError("GitHub 统计暂时无法更新，作品展示与访问不受影响。");
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

  return { repos, loading, error, retry: () => setAttempt(value => value + 1) };
}
