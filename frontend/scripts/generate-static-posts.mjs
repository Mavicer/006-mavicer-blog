import { readdirSync, readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

// Build the API's allowlist from the same Markdown files Vite imports.
// No database seeding or production credentials are needed to publish a post.
export function publishedPosts(directory) {
  const slugs = new Set();
  const posts = [];
  for (const file of readdirSync(directory).filter((name) => name.endsWith(".md"))) {
    const raw = readFileSync(new URL(file, directory), "utf8");
    const frontmatter = raw.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/)?.[1] || "";
    const data = Object.fromEntries(frontmatter.split(/\r?\n/).flatMap((line) => {
      const match = line.match(/^([A-Za-z0-9_]+):\s*(.*)$/);
      return match ? [[match[1], match[2].trim().replace(/^["']|["']$/g, "")]] : [];
    }));
    if (data.published === "false") continue;
    const slug = data.slug || file.slice(0, -3);
    if (slugs.has(slug)) throw new Error(`Duplicate article slug: ${slug}`);
    slugs.add(slug);
    const tags = (data.tags || "").replace(/^\[|\]$/g, "").split(",")
      .map((tag) => tag.trim().replace(/^["']|["']$/g, "")).filter(Boolean);
    posts.push({ slug, title: data.title || slug, date: data.date || "", category: data.category || "未分类",
      excerpt: data.excerpt || "", tags, published: true, sortOrder: Number(data.sort_order || 10) });
  }
  return posts.sort((a, b) => a.slug.localeCompare(b.slug));
}

export function publishedSlugs(directory) { return publishedPosts(directory).map((post) => post.slug).sort(); }

export function generate() {
  const posts = publishedPosts(new URL("../src/data/posts/", import.meta.url));
  const slugs = posts.map((post) => post.slug).sort();
  const output = new URL("../generated/", import.meta.url);
  mkdirSync(output, { recursive: true });
  writeFileSync(new URL("static-post-slugs.json", output), JSON.stringify(slugs, null, 2) + "\n");
  writeFileSync(new URL("static-posts.json", output), JSON.stringify(posts, null, 2) + "\n");
  console.log(`Generated API allowlist for ${slugs.length} static posts`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) generate();
