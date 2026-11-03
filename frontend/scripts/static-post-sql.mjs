import { publishedPosts } from "./generate-static-posts.mjs";
import { fileURLToPath } from "node:url";
// Emit one reviewed upsert. Preserve the slug, created_at and all interactions.
export function staticPostSql(slug) {
  const p = publishedPosts(new URL("../src/data/posts/", import.meta.url)).find((p) => p.slug === slug);
  if (!p) throw new Error(`Published Markdown not found: ${slug}`);
  const quote = (v) => `'${String(v).replaceAll("'", "''")}'`;
  const fields = ['slug','title','date','excerpt','source','category','tags','body','published','sort_order','created_at','updated_at'];
  const values = [p.slug,p.title,p.date,p.excerpt,'static',p.category,p.tags.join(','),p.body,1,p.sortOrder,p.date,p.updated_at || p.date];
  return `INSERT INTO post (${fields.join(',')}) VALUES (${values.map(quote).join(',')}) ON CONFLICT(slug) DO UPDATE SET ${fields.filter((f) => !['slug','created_at'].includes(f)).map((f) => `${f}=excluded.${f}`).join(',')};\n`;
}
if (process.argv[1] === fileURLToPath(import.meta.url)) process.stdout.write(staticPostSql(process.argv[2]));
