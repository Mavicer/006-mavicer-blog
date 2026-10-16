import { parse } from "yaml";

export function parseArticle(raw: string): { data: Record<string, unknown>; body: string } {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!match) return { data: {}, body: raw };
  const data = parse(match[1], { maxAliasCount: 0 });
  if (!data || typeof data !== "object" || Array.isArray(data)) throw new Error("文章头信息必须是键值格式");
  return { data, body: match[2] };
}

export function plainToMarkdown(input: string): string {
  // Reflow within each original paragraph without rewriting the author's words.
  // Escape Markdown syntax so plain text cannot accidentally become HTML/lists.
  return input.replace(/\r\n?/g, "\n").trim().split(/\n\s*\n/).map((paragraph) =>
    paragraph.split("\n").map((line) => line.trim()).reduce((text, line) =>
      text + (/[A-Za-z0-9]$/.test(text) && /^[A-Za-z0-9]/.test(line) ? " " : "") + line, "")
      .replace(/[\\`*_\[\]{}<>#!|.()+\-]/g, "\\$&")
  ).join("\n\n") + "\n";
}

export function serializeArticle(data: Record<string, unknown>, body: string): string {
  const lines = Object.entries(data).filter(([key, value]) => /^[A-Za-z0-9_]+$/.test(key) && value !== undefined)
    .map(([key, value]) => `${key}: ${JSON.stringify(value)}`);
  return `---\n${lines.join("\n")}\n---\n\n${body.replace(/\r\n?/g, "\n").replace(/^\n+|\n+$/g, "")}\n`;
}
