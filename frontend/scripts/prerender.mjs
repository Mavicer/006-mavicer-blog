import { readFileSync, writeFileSync, mkdirSync, rmSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { build } from "vite";
import react from "@vitejs/plugin-react";
import { build as bundle } from "esbuild";
import { sourceLastmod } from "./generate-static-posts.mjs";

// Vite compiles the same components used in the browser. No headless crawler,
// second template, production database or credentials are needed for the build.
const root = fileURLToPath(new URL("../", import.meta.url));
const serverDir = new URL("../.prerender/", import.meta.url);
await build({ root, configFile: false, plugins: [react()], resolve: { alias: {
  "@": new URL("../src/", import.meta.url).pathname,
  "dompurify": new URL("./server-purify.mjs", import.meta.url).pathname,
} }, logLevel: "error", build: {
  ssr: "src/entry-server.tsx", outDir: fileURLToPath(serverDir),
  rollupOptions: { input: "src/entry-server.tsx", output: { manualChunks: undefined } },
} });
const { render, routes } = await import(new URL("entry-server.js", serverDir));
const { outputFiles } = await bundle({ entryPoints: [new URL("../shared/seo.ts", import.meta.url).pathname], bundle: true, platform: "node", format: "esm", write: false });
const { ORIGIN, seoFor, seoMarkup, escapeHtml } = await import(`data:text/javascript;base64,${Buffer.from(outputFiles[0].contents).toString("base64")}`);
const posts = JSON.parse(readFileSync(new URL("../generated/static-post-details.json", import.meta.url), "utf8"));
const dist = new URL("../dist/", import.meta.url);
const template = readFileSync(new URL("index.html", dist), "utf8");
function document(body, head, path) {
  return template.replace(/<title>[\s\S]*?<\/title>/, head)
    .replace('<div id="root"></div>', `<div id="root" data-prerendered="${escapeHtml(path)}">${body}</div>`);
}
function save(file, html) {
  const target = new URL(file, dist); mkdirSync(new URL("./", target), { recursive: true }); writeFileSync(target, html);
}
const paths = routes();
for (const path of paths) {
  const { body, head } = await render(path);
  // Extensionless files avoid Pages' directory trailing-slash redirects.
  save(path === "/" ? "index.html" : `${decodeURI(path.slice(1))}.html`, document(body, head, path));
}
// Keep the original SPA shell for private and historical D1-only routes.
save("_shell.html", document("", seoMarkup(seoFor("/account", posts)), ""));
save("404.html", document((await render("/404")).body, seoMarkup(seoFor("/404", posts)), "/404"));
const urls = paths.map(path => {
  const post = posts.find(p => path === `/posts/${encodeURIComponent(p.slug)}`);
  const pageSource = { "/": "src/pages/Home.tsx", "/archives": "src/pages/Archives.tsx", "/about": "src/config/site.ts", "/projects": "src/data/projects.ts" }[path];
  const lastmod = post?.updated_at || (pageSource ? sourceLastmod(fileURLToPath(new URL(pageSource, new URL("../", import.meta.url)))) : "");
  return `  <url><loc>${escapeHtml(ORIGIN + path)}</loc>${lastmod ? `<lastmod>${escapeHtml(lastmod)}</lastmod>` : ""}</url>`;
});
save("sitemap.xml", `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join("\n")}\n</urlset>\n`);
// Leave private HTML crawlable so crawlers can actually observe noindex.
save("robots.txt", `User-agent: *\nAllow: /\nDisallow: /api/\nSitemap: ${ORIGIN}/sitemap.xml\n`);
writeFileSync(new URL("../generated/public-paths.json", import.meta.url), JSON.stringify(paths));
// Skip the Function for immutable assets; page requests need host/noindex policy.
save("_routes.json", JSON.stringify({ version: 1, include: ["/*"], exclude: ["/assets/*", "/images/*", "/fonts/*", "/media/*", "/vendor/*", "/_publication.json"] }));
rmSync(serverDir, { recursive: true, force: true });
console.log(`Prerendered ${paths.length} public pages, sitemap.xml and robots.txt`);
