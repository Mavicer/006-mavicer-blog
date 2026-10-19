/** Public repository proxy; successful responses are cached for ten minutes. */
export const onRequestGet: PagesFunction = async (ctx) => {
  const cache = caches.default;
  const key = new Request(new URL('/api/projects', ctx.request.url));
  const cached = await cache.match(key);
  if (cached) return cached;
  try {
    const response = await fetch('https://api.github.com/users/Mavicer/repos?sort=updated&per_page=100', {
      headers: { Accept: 'application/vnd.github+json', 'User-Agent': 'Mavicer-Blog' },
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) throw new Error(`GitHub HTTP ${response.status}`);
    const data: unknown = await response.json();
    if (!Array.isArray(data) || !data.every((repo) => repo &&
      typeof repo.name === 'string' && typeof repo.fork === 'boolean' &&
      typeof repo.html_url === 'string' && repo.html_url.startsWith('https://github.com/Mavicer/') &&
      typeof repo.updated_at === 'string')) throw new Error('Invalid GitHub response');
    const repos = data.filter((repo) => !repo.fork).map((repo) => ({
      name: repo.name,
      description: typeof repo.description === 'string' ? repo.description : null,
      html_url: repo.html_url,
      language: typeof repo.language === 'string' ? repo.language : null,
      stars: typeof repo.stargazers_count === 'number' ? repo.stargazers_count : 0,
      forks: typeof repo.forks_count === 'number' ? repo.forks_count : 0,
      topics: Array.isArray(repo.topics) ? repo.topics.filter((t: unknown) => typeof t === 'string') : [],
      updated_at: repo.updated_at,
    }));
    const result = Response.json(repos, { headers: { 'Cache-Control': 'public, max-age=600' } });
    ctx.waitUntil(cache.put(key, result.clone()).catch((error) => console.error('Projects cache write failed', error)));
    return result;
  } catch (error) {
    console.error('Projects fetch failed', error);
    return Response.json({ detail: 'Projects temporarily unavailable' }, {
      status: 503, headers: { 'Cache-Control': 'no-store' },
    });
  }
};
