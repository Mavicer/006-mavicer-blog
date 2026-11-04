export const ORIGIN = "https://mavicer.cc";
export const SITE_NAME = "Mavicer's Blog";
export type SeoPost = {
  slug: string; title: string; excerpt: string; date: string; updated_at?: string;
  category: string; tags: string[]; cover?: string;
};
const pages: Record<string, [string, string]> = {
  "/": [SITE_NAME, "Mavicer 的个人博客，记录 AI 开发、项目实践、学习思考与生活。"],
  "/archives": ["文章归档", "按时间浏览 Mavicer 的文章，记录技术实践、学习与生活。"],
  "/categories": ["文章分类", "按分类浏览 Mavicer 的技术文章、学习记录与随笔。"],
  "/tags": ["文章标签", "按标签查找 Mavicer 博客中相关主题的文章。"],
  "/about": ["关于我", "了解 Leon Kong（Mavicer）的学习背景、兴趣与项目方向。"],
  "/projects": ["Projects", "Mavicer 的个人项目与实践，包括博客、VisualLab 和 Nexus。"],
};

export function publicPaths(posts: SeoPost[]): string[] {
  return [...Object.keys(pages), ...posts.map(p => `/posts/${encodeURIComponent(p.slug)}`),
    ...[...new Set(posts.map(p => p.category))].sort().map(c => `/categories/${encodeURIComponent(c)}`),
    ...[...new Set(posts.flatMap(p => p.tags))].sort().map(t => `/tags/${encodeURIComponent(t)}`)];
}

export function normalizePath(path: string): string {
  try {
    return path.split("/").map(part => encodeURIComponent(decodeURIComponent(part))).join("/").replace(/\/+$/, "") || "/";
  } catch { return "/404"; }
}

export function seoFor(pathname: string, posts: SeoPost[], hostname = "mavicer.cc") {
  const path = normalizePath(pathname);
  const post = posts.find(p => path === `/posts/${encodeURIComponent(p.slug)}`);
  const isPublic = publicPaths(posts).includes(path);
  const index = isPublic && hostname === "mavicer.cc";
  let [name, description] = pages[path] || ["页面不存在", "页面不存在或已被移动。"];
  if (post) { name = post.title; description = post.excerpt; }
  for (const [prefix, label] of [["categories", "分类"], ["tags", "标签"]]) {
    if (isPublic && path.startsWith(`/${prefix}/`)) {
      const term = decodeURIComponent(path.slice(prefix.length + 2));
      name = `${label}：${term}`;
      description = `浏览 Mavicer 博客中${label}「${term}」下的文章。`;
    }
  }
  if (/^\/(login|register|account|admin|feedback|gallery)(\/|$)/.test(path)) {
    name = path.startsWith("/login") ? "登录" : path.startsWith("/register") ? "注册" : "个人空间";
    description = "Mavicer 博客的账户与管理功能。";
  }
  const url = ORIGIN + path;
  const person = { "@type": "Person", "@id": `${ORIGIN}/about#person`, name: "Mavicer", url: `${ORIGIN}/about`, sameAs: ["https://github.com/Mavicer"] };
  const graph: Record<string, unknown>[] = [
    { "@type": "WebSite", "@id": `${ORIGIN}/#website`, url: ORIGIN + "/", name: SITE_NAME, publisher: { "@id": person["@id"] } }, person,
  ];
  const hasCover = post?.cover && /^(https:\/\/|\/[^/])/.test(post.cover);
  const image = hasCover ? new URL(post!.cover!, ORIGIN).href : `${ORIGIN}/images/projects/blog-home.jpg`;
  const imageAlt = hasCover ? post!.title : `${SITE_NAME} 首页截图`;
  if (path === "/") graph.push({ "@type": "Blog", "@id": `${ORIGIN}/#blog`, name: SITE_NAME, url, description, author: { "@id": person["@id"] } });
  if (post) graph.push({ "@type": "BlogPosting", "@id": url + "#article", headline: post.title, description,
    url, mainEntityOfPage: url, author: { "@id": person["@id"] }, image,
    ...(post.date ? { datePublished: post.date } : {}), ...(post.updated_at ? { dateModified: post.updated_at } : {}),
    articleSection: post.category, keywords: post.tags.join(", ") });
  if (isPublic && path !== "/") graph.push({ "@type": "BreadcrumbList", itemListElement: [
    { "@type": "ListItem", position: 1, name: "首页", item: ORIGIN + "/" },
    ...(post ? [{ "@type": "ListItem", position: 2, name: "文章归档", item: ORIGIN + "/archives" }] : []),
    { "@type": "ListItem", position: post ? 3 : 2, name, item: url },
  ] });
  return { title: name === SITE_NAME ? name : `${name} | ${SITE_NAME}`, description, url, image, imageAlt, post, index,
    structured: isPublic ? { "@context": "https://schema.org", "@graph": graph } : null };
}

export function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

export function seoMarkup(seo: ReturnType<typeof seoFor>): string {
  const tag = (key: string, content: string, property = false) => `<meta data-seo ${property ? "property" : "name"}="${key}" content="${escapeHtml(content)}">`;
  return [`<title data-seo>${escapeHtml(seo.title)}</title>`,
    tag("description", seo.description), tag("robots", seo.index ? "index, follow, max-image-preview:large" : "noindex, follow"),
    `<link data-seo rel="canonical" href="${escapeHtml(seo.url)}">`,
    ...Object.entries({ "og:title": seo.title, "og:description": seo.description, "og:url": seo.url,
      "og:type": seo.post ? "article" : "website", "og:site_name": SITE_NAME, "og:image": seo.image, "og:image:alt": seo.imageAlt })
      .map(([key, value]) => tag(key, value, true)),
    ...(seo.post ? [tag("article:author", `${ORIGIN}/about`, true),
      ...(seo.post.date ? [tag("article:published_time", seo.post.date, true)] : []),
      ...(seo.post.updated_at ? [tag("article:modified_time", seo.post.updated_at, true)] : [])] : []),
    tag("twitter:card", "summary_large_image"), tag("twitter:title", seo.title), tag("twitter:description", seo.description), tag("twitter:image", seo.image), tag("twitter:image:alt", seo.imageAlt),
    ...(seo.structured ? [`<script data-seo type="application/ld+json">${JSON.stringify(seo.structured).replace(/</g, "\\u003c")}</script>`] : []),
  ].join("\n");
}
