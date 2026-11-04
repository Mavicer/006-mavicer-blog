import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { pathToFileURL } from 'node:url';
import { join } from 'node:path';
import { build } from 'esbuild';
import { publishedPosts } from '../scripts/generate-static-posts.mjs';
const { outputFiles } = await build({ entryPoints: [new URL('../shared/seo.ts', import.meta.url).pathname], bundle: true, platform: 'node', format: 'esm', write: false });
const { seoFor, seoMarkup, publicPaths } = await import(`data:text/javascript;base64,${Buffer.from(outputFiles[0].contents).toString('base64')}`);
const posts = publishedPosts(new URL('../src/data/posts/', import.meta.url));

test('every published article and taxonomy has canonical metadata and honest schema', () => {
  for (const path of publicPaths(posts)) {
    const seo = seoFor(path + '/', posts);
    assert.equal(seo.index, true, path);
    assert.equal(seo.url, 'https://mavicer.cc' + path);
    assert(seo.title && seo.description);
    const markup = seoMarkup(seo);
    assert(markup.includes('twitter:card') && markup.includes('og:title'));
    assert(!markup.includes('pages.dev'));
  }
  for (const post of posts) {
    const seo = seoFor('/posts/' + post.slug, posts);
    const article = seo.structured['@graph'].find(item => item['@type'] === 'BlogPosting');
    assert.equal(article.datePublished, post.date);
    assert.equal(article.dateModified, post.updated_at || undefined);
    assert.equal(article.headline, post.title);
    assert(!('aggregateRating' in article) && !('commentCount' in article));
  }
});

test('private, unknown and preview URLs cannot be indexed', () => {
  for (const path of ['/login', '/register', '/account', '/admin', '/admin/articles/new', '/gallery/admin', '/missing', '/posts/missing', '/tags/missing']) {
    assert.equal(seoFor(path, posts).index, false, path);
  }
  for (const path of publicPaths(posts)) {
    const seo = seoFor(path, posts, 'abc.blog-cmc.pages.dev');
    assert.equal(seo.index, false);
    assert.equal(new URL(seo.url).origin, 'https://mavicer.cc');
  }
});

test('draft titles, bodies and taxonomy never enter the public generation pipeline', () => {
  const directory = mkdtempSync(join(tmpdir(), 'mavicer-seo-'));
  try {
    writeFileSync(join(directory, 'draft.md'), '---\ntitle: SECRET_TITLE\npublished: false\ntags: [SECRET_TAG]\n---\nSECRET_BODY');
    writeFileSync(join(directory, 'visible.md'), '---\ntitle: visible\ndate: "2026-07-26"\nupdated_at: "2026-11-04"\n---\nvisible body');
    const catalog = publishedPosts(pathToFileURL(directory + '/'));
    assert.equal(catalog.length, 1);
    assert.equal(catalog[0].updated_at, '2026-11-04');
    assert(!JSON.stringify(catalog).includes('SECRET'));
    assert(!JSON.stringify(publicPaths(catalog)).includes('SECRET'));
    assert.equal(seoFor('/posts/draft', catalog).index, false);
    writeFileSync(join(directory, 'new.md'), '---\ntitle: new\ndate: "2026-11-04"\n---\nnew body');
    assert(publicPaths(publishedPosts(pathToFileURL(directory + '/'))).includes('/posts/new'));
  } finally { rmSync(directory, { recursive: true, force: true }); }
});

test('metadata escapes hostile titles, excerpts and JSON-LD script delimiters', () => {
  const hostile = { ...posts[0], title: '</title><script>alert(1)</script>', excerpt: '"><img onerror=alert(1)>', slug: 'safe' };
  const markup = seoMarkup(seoFor('/posts/safe', [hostile]));
  assert(!markup.includes('<script>alert(1)'));
  assert(!markup.includes('<img onerror'));
  const ld = markup.match(/type="application\/ld\+json">([\s\S]*?)<\/script>/)[1];
  assert.equal(JSON.parse(ld)['@graph'].find(x => x['@type'] === 'BlogPosting').headline, hostile.title);
});
