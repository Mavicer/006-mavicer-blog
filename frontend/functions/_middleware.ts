import posts from "../generated/static-posts.json";
import drafts from "../generated/unpublished-static-post-slugs.json";
import { normalizePath, publicPaths } from "../shared/seo";

const publicPages = new Set(publicPaths(posts));
const unpublished = new Set<string>(drafts);
const privatePage = /^\/(login|register|account|feedback|gallery)(\/|$)|^\/admin(?:\/|$)/;
type Bindings = { DB: D1Database; ASSETS: Fetcher };

export const onRequest: PagesFunction<Bindings> = async ctx => {
  const url = new URL(ctx.request.url);
  // Preserve API routing, sessions and origin validation exactly as before.
  if (url.pathname.startsWith("/api/")) return ctx.next();
  if (url.hostname === "www.mavicer.cc") {
    url.hostname = "mavicer.cc";
    return Response.redirect(url.href, 308);
  }
  if (url.pathname === "/robots.txt" && url.hostname !== "mavicer.cc")
    return new Response("User-agent: *\nDisallow: /\n", { headers: { "Content-Type": "text/plain; charset=utf-8", "X-Robots-Tag": "noindex" } });

  let path = normalizePath(url.pathname.replace(/\.html$/, ""));
  const isPublic = publicPages.has(path);
  if ((isPublic || privatePage.test(path)) && path !== url.pathname) {
    url.pathname = path;
    return Response.redirect(url.href, 308);
  }
  const asset = (name: string) => {
    const target = new URL(ctx.request.url); target.pathname = name; target.search = "";
    return ctx.env.ASSETS.fetch(new Request(target, { method: ctx.request.method === "HEAD" ? "HEAD" : "GET" }));
  };
  let response: Response;
  if (privatePage.test(path)) {
    response = await asset("/_shell");
  } else if (!isPublic && /^\/posts\/[^/]+$/.test(path)) {
    const slug = decodeURIComponent(path.slice(7));
    // Keep historical published D1-only URLs working. Static drafts override
    // stale D1 publication flags, just as the existing API does.
    let legacy = false;
    if (!unpublished.has(slug)) {
      try {
        legacy = !!await ctx.env.DB.prepare("SELECT slug FROM post WHERE slug = ? AND published = 1").bind(slug).first();
      } catch {
        return new Response("文章服务暂时不可用", { status: 503, headers: { "X-Robots-Tag": "noindex", "Retry-After": "60" } });
      }
    }
    const page = await asset(legacy ? "/_shell" : "/404");
    response = new Response(page.body, { status: legacy ? 200 : 404, headers: page.headers });
  } else {
    response = await ctx.next();
  }
  const headers = new Headers(response.headers);
  const html = headers.get("Content-Type")?.includes("text/html");
  if (html && !path.startsWith("/appearance-bridge")) headers.set("X-Frame-Options", "DENY");
  const noindex = url.hostname !== "mavicer.cc" || !isPublic || response.status >= 400;
  if (noindex) headers.set("X-Robots-Tag", "noindex, follow");
  let result = new Response(response.body, { status: response.status, statusText: response.statusText, headers });
  if (html && noindex) result = new HTMLRewriter().on('meta[name="robots"]', {
    element(element) { element.setAttribute("content", "noindex, follow"); },
  }).transform(result);
  return result;
};
