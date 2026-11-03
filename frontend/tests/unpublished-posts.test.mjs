import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { publishedPosts, unpublishedSlugs } from "../scripts/generate-static-posts.mjs";

const directory = new URL("../src/data/posts/", import.meta.url);
const generated = new URL("../generated/", import.meta.url);

test("unpublished Markdown stays out of public article catalogs and browser sources", () => {
  const published = publishedPosts(directory);
  const hidden = unpublishedSlugs(directory);
  const catalog = JSON.parse(readFileSync(new URL("static-posts.json", generated), "utf8"));
  const publicSources = JSON.parse(readFileSync(new URL("published-post-raw.json", generated), "utf8"));
  const denylist = JSON.parse(readFileSync(new URL("unpublished-static-post-slugs.json", generated), "utf8"));
  const publishedSlugs = new Set(published.map((post) => post.slug));

  assert.deepEqual(denylist, hidden);
  assert.deepEqual(catalog.map((post) => post.slug).sort(), [...publishedSlugs].sort());
  for (const slug of hidden) assert.equal(publishedSlugs.has(slug), false);

  assert.deepEqual(
    Object.keys(publicSources).sort(),
    published.map((post) => `../data/posts/${post.file}`).sort(),
  );
  for (const slug of hidden) {
    const expectedPath = `../data/posts/${slug}.md`;
    assert.equal(Object.hasOwn(publicSources, expectedPath), false);
  }
});
