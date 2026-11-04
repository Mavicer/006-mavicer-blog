import { readdirSync, readFileSync, mkdirSync, writeFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { parse } from "yaml";

// A shallow checkout's boundary commit is not a reliable file modification date.
// Explicit frontmatter dates work in shallow CI; otherwise omit unknown dates.
export function sourceLastmod(file) {
  try {
    const cwd = fileURLToPath(new URL("../", import.meta.url));
    if (execFileSync("git", ["rev-parse", "--is-shallow-repository"], { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim() !== "false") return "";
    if (execFileSync("git", ["status", "--porcelain", "--", file], { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim()) return "";
    return execFileSync("git", ["log", "-1", "--format=%cI", "--", file], { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
  } catch { return ""; }
}

// Build the API's allowlist from the same Markdown files Vite imports.
// No database seeding or production credentials are needed to publish a post.
export function publishedPosts(directory) {
  const slugs = new Set();
  const posts = [];
  for (const file of readdirSync(directory).filter((name) => name.endsWith(".md"))) {
    const raw = readFileSync(new URL(file, directory), "utf8");
    const frontmatter = raw.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/)?.[1] || "";
    const data = parse(frontmatter, { maxAliasCount: 0 }) || {};
    if (data.published === false) continue;
    const slug = data.slug || file.slice(0, -3);
    if (typeof slug !== "string" || !/^[A-Za-z0-9][A-Za-z0-9_-]*$/.test(slug)) throw new Error(`Invalid article slug: ${file}`);
    if (slugs.has(slug)) throw new Error(`Duplicate article slug: ${slug}`);
    slugs.add(slug);
    const tags = Array.isArray(data.tags) ? data.tags.filter((tag) => typeof tag === "string") : [];
    const sha = createHash("sha1").update(`blob ${Buffer.byteLength(raw)}\0`).update(raw).digest("hex");
    posts.push({ slug, file, sha, title: data.title || slug, date: data.date || "", category: data.category || "未分类",
      excerpt: data.excerpt || "", tags, published: true, sortOrder: Number(data.sort_order || 10),
      updated_at: data.updated_at || sourceLastmod(fileURLToPath(new URL(file, directory))),
      cover: typeof data.cover === "string" ? data.cover : undefined,
      readingTime: typeof data.reading_time === "string" ? data.reading_time : undefined,
      body: raw.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, "") });
  }
  return posts.sort((a, b) => a.slug.localeCompare(b.slug));
}

export function publishedSlugs(directory) { return publishedPosts(directory).map((post) => post.slug).sort(); }

// Keep draft slugs in the deployed API's denylist, even if old D1 rows still say published.
export function unpublishedSlugs(directory) {
  const slugs = [];
  for (const file of readdirSync(directory).filter((name) => name.endsWith(".md"))) {
    const raw = readFileSync(new URL(file, directory), "utf8");
    const frontmatter = raw.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/)?.[1] || "";
    const data = parse(frontmatter, { maxAliasCount: 0 }) || {};
    if (data.published === false) slugs.push(data.slug || file.slice(0, -3));
  }
  return slugs.sort();
}

export function generate() {
  const directory = new URL("../src/data/posts/", import.meta.url);
  const posts = publishedPosts(directory);
  const drafts = unpublishedSlugs(directory);
  const slugs = posts.map((post) => post.slug).sort();
  const output = new URL("../generated/", import.meta.url);
  mkdirSync(output, { recursive: true });
  writeFileSync(new URL("static-post-slugs.json", output), JSON.stringify(slugs, null, 2) + "\n");
  writeFileSync(new URL("static-posts.json", output), JSON.stringify(posts.map(({ body, ...post }) => post), null, 2) + "\n");
  writeFileSync(new URL("static-post-details.json", output), JSON.stringify(posts, null, 2) + "\n");
  writeFileSync(new URL("unpublished-static-post-slugs.json", output), JSON.stringify(drafts, null, 2) + "\n");
  // Only published Markdown goes into the public Vite bundle; draft files stay in Git.
  const publicSources = Object.fromEntries(posts.map(({ file }) =>
    [`../data/posts/${file}`, readFileSync(new URL(file, directory), "utf8")]));
  writeFileSync(new URL("published-post-raw.json", output), JSON.stringify(publicSources) + "\n");
  // A wildcard Vite import would bundle translations of unpublished posts too.
  const translations = Object.fromEntries(posts.flatMap(({ slug }) => {
    const file = new URL(`../src/data/bilingual/${slug}-zh.md`, import.meta.url);
    return existsSync(file) ? [[slug, readFileSync(file, "utf8")]] : [];
  }));
  writeFileSync(new URL("published-translations.json", output), JSON.stringify(translations) + "\n");
  writeFileSync(new URL("bilingual-slugs.json", output), JSON.stringify(Object.keys(translations)) + "\n");
  writeFileSync(new URL("../public/_publication.json", import.meta.url), JSON.stringify({
    commit: process.env.CF_PAGES_COMMIT_SHA || "local", articles: posts.map(({ slug, sha }) => ({ slug, sha }))
  }) + "\n");
  console.log(`Generated API allowlist for ${slugs.length} static posts`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) generate();
