import { marked } from "marked";
import hljs from "./highlight";
import katex from "katex";
import DOMPurify from "dompurify";

// Configure marked once.
marked.setOptions({
  breaks: true,
  gfm: true,
});

const renderer = new marked.Renderer();

// Wrap code blocks with a mac-style header (language label + traffic dots),
// and run highlight.js for syntax coloring.
renderer.code = ({ text, lang }: { text: string; lang?: string }) => {
  const language = (lang || "").trim();
  let highlighted = text;
  try {
    highlighted =
      language && hljs.getLanguage(language)
        ? hljs.highlight(text, { language }).value
        : hljs.highlightAuto(text).value;
  } catch {
    highlighted = escapeHtml(text);
  }
  const dots = `
    <div class="mac-dots">
      <span style="background:#ff5f56"></span>
      <span style="background:#ffbd2e"></span>
      <span style="background:#27c93f"></span>
    </div>`;
  return `<div class="code-block">
    <div class="code-block-header">
      ${dots}
      <span>${language || "text"}</span>
    </div>
    <pre><code class="hljs language-${language}">${highlighted}</code></pre>
  </div>`;
};

renderer.codespan = ({ text }: { text: string }) =>
  `<code>${text}</code>`;

// Only allow http(s) and mailto URLs in links/images — blocks javascript:.
const SAFE_URL = /^(https?:|mailto:|\/|#|data:image\/)/i;

renderer.link = ({ href, title, tokens }) => {
  const text = (marked as any).Parser.parseInline(tokens);
  if (!href || !SAFE_URL.test(href)) {
    return `<span>${text}</span>`;
  }
  const isExternal = /^https?:\/\//.test(href);
  const safeHref = href.replace(/"/g, "&quot;");
  const safeTitle = title ? ` title="${title.replace(/"/g, "&quot;")}"` : "";
  return `<a class="link" ${
    isExternal ? 'target="_blank" rel="noopener noreferrer"' : ""
  } href="${safeHref}"${safeTitle}>${text}</a>`;
};

renderer.image = ({ href, title, text }) => {
  if (!href || !SAFE_URL.test(href)) return "";
  const safeHref = href.replace(/"/g, "&quot;");
  const safeAlt = (text || "").replace(/"/g, "&quot;");
  const safeTitle = title ? ` title="${title.replace(/"/g, "&quot;")}"` : "";
  return `<img src="${safeHref}" alt="${safeAlt}" ${safeTitle} loading="lazy" data-viewer />`;
};

renderer.heading = ({ text, depth }) =>
  `<h${depth} id="${slugify(stripHtml(text))}">${text}</h${depth}>`;

marked.use({ renderer });

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function stripHtml(s: string): string {
  return s.replace(/<[^>]+>/g, "");
}

function slugify(s: string): string {
  return (
    s
      .toLowerCase()
      .replace(/[^\w一-龥]+/g, "-")
      .replace(/^-+|-+$/g, "") || "heading"
  );
}

// --- Math: protect $$...$$ and $...$ from marked, render with KaTeX. ---
const MATH_BLOCK = /@@ALEPH_MATH_(\d+)@@/g;

function protectMath(markdown: string) {
  const blocks: string[] = [];
  let text = markdown.replace(/\$\$([\s\S]*?)\$\$/g, (_, body) => {
    blocks.push(renderKatex(body, true));
    return `\n\n@@ALEPH_MATH_${blocks.length - 1}@@\n\n`;
  });
  text = text.replace(/\$([^\$\n]+?)\$/g, (_, body) => {
    blocks.push(renderKatex(body, false));
    return `@@ALEPH_MATH_${blocks.length - 1}@@`;
  });
  return { text, blocks };
}

function renderKatex(tex: string, display: boolean): string {
  try {
    return katex.renderToString(tex, {
      displayMode: display,
      throwOnError: false,
    });
  } catch {
    return tex;
  }
}

// Sanitize HTML output to prevent XSS — strips <script>, on* event
// handlers, javascript: URLs, and other injection vectors. This runs
// AFTER KaTeX substitution so math output (which is already escaped
// by KaTeX) survives intact.
const PURIFY_CONFIG = {
  ALLOWED_TAGS: [
    "a", "b", "i", "em", "strong", "u", "s", "del", "mark", "small",
    "sub", "sup", "br", "hr", "span", "div", "p", "blockquote", "pre",
    "code", "h1", "h2", "h3", "h4", "h5", "h6", "ul", "ol", "li",
    "table", "thead", "tbody", "tr", "th", "td", "img", "figure",
    "figcaption", "details", "summary", "abbr", "cite", "q", "kbd",
    "var", "samp", "time", "ruby", "rt", "rp", "bdi", "bdo", "wbr",
    "input", "iframe", // KaTeX uses these; DOMPurify will strip dangerous attrs
    "math", "semantics", "mrow", "mi", "mo", "mn", "msup", "msub",
    "msubsup", "mfrac", "mtext", "mspace", "annotation", "menclose",
    "mover", "munder", "munderover", "mtable", "mtr", "mtd",
  ],
  ALLOWED_ATTR: [
    "href", "title", "src", "alt", "class", "id", "style",
    "target", "rel", "loading", "data-viewer", "colspan", "rowspan",
    "width", "height", "align", "valign", "type", "checked", "disabled",
    "frameborder", "allow", "allowfullscreen", "encoding",
    // KaTeX/MathML attributes
    "xmlns", "mathvariant", "notation", "stretchy", "fence", "separator",
    "accent", "accentunder", "columnalign", "rowalign", "columnspacing",
    "rowspacing", "columnlines", "rowlines", "frame", "framespacing",
    "equalrows", "equalcolumns", "side", "maxwidth", "close", "open",
    "form", "lspace", "rspace", "movablelimits", "scriptlevel",
    "displaystyle", "scriptminsize", "scriptsizemultiplier",
    "bevelled", "denomalign", "numalign", "linethickness",
    "selection", "notation", "dir", "href",
  ],
  ALLOW_DATA_ATTR: false,
  FORBID_TAGS: ["script", "object", "embed", "form", "input[type=hidden]"],
  FORBID_ATTR: ["onerror", "onload", "onclick", "onmouseover", "onfocus", "onblur"],
};

export function renderMarkdown(markdown: string): string {
  const { text, blocks } = protectMath(markdown);
  let html = marked.parse(text) as string;
  html = html.replace(MATH_BLOCK, (_, i) => blocks[Number(i)] || "");
  // Final XSS defense: sanitize all rendered HTML before it reaches
  // dangerouslySetInnerHTML. This strips <script> tags, on* event
  // handlers, javascript: URLs, and other injection vectors.
  html = DOMPurify.sanitize(html, PURIFY_CONFIG);
  return html;
}

export type TocItem = { level: number; text: string; id: string };

export function extractToc(markdown: string): TocItem[] {
  const items: TocItem[] = [];
  const lines = markdown.split("\n");
  let inCode = false;
  for (const line of lines) {
    const trimmed = line.trim();
    if (/^```/.test(trimmed)) {
      inCode = !inCode;
      continue;
    }
    if (inCode) continue;
    const m = trimmed.match(/^(#{1,3})\s+(.+)$/);
    if (m) {
      const level = m[1].length;
      const text = stripHtml(m[2]);
      items.push({ level, text, id: slugify(text) });
    }
  }
  return items;
}
