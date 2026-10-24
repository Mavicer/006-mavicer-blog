/** Render the production build with the real API handler and isolated SQLite D1 fixture.
 * Network routing replaces the Pages host only; comment responses are not canned.
 */
import assert from "node:assert/strict";
import { readFileSync, mkdirSync } from "node:fs";
import { resolve, extname } from "node:path";
import { chromium } from "playwright";
import { fixture } from "../tests/helpers/api.mjs";

const origin = "https://comments.test";
const f = fixture({ legacy: true, origin });
const author = await f.register("author"), other = await f.register("other"), owner = await f.register("owner");
f.sqlite.prepare("UPDATE blog_user SET is_owner = 1 WHERE id = ?").run(owner.data.user.id);
const collection = "/posts/outside-the-classroom/comments";
const created = await f.request(collection, { method: "POST", cookie: author.cookie, body: { body: "作者的原始评论\n保留第二行" } });
await f.request(collection, { method: "POST", cookie: owner.cookie, body: { body: "博主自己的评论" } });
assert.equal(created.status, 201);
const dist = resolve("dist");
const output = process.env.COMMENTS_SCREENSHOT_DIR;
if (output) mkdirSync(output, { recursive: true });
const browser = await chromium.launch({ channel: process.env.PLAYWRIGHT_CHANNEL || "chrome", headless: true });
const pageErrors = [];
let failMethod = "";
let writes = 0;
async function openAccount(account, width = 1440) {
  const context = await browser.newContext({ viewport: { width, height: 1000 } });
  await context.addInitScript(() => localStorage.setItem("MAVICER_THEME_MODE", "light"));
  if (account) await context.addCookies([{ name: "__Host-blog_session", value: account.cookie.split("=")[1], domain: "comments.test", path: "/", secure: true, httpOnly: true, sameSite: "Lax" }]);
  await context.route("**/*", async (route) => {
    const request = route.request(), url = new URL(request.url());
    if (url.origin !== origin) return route.abort();
    if (url.pathname.startsWith("/api/")) {
      if (["PATCH", "DELETE"].includes(request.method()) && url.pathname.includes("/comments/")) {
        writes++;
        if (failMethod === request.method()) {
          failMethod = "";
          return route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ detail: "模拟网络失败，请重试" }) });
        }
      }
      const response = await f.request(url.pathname.slice(4) + url.search, { method: request.method(), body: request.postData() || undefined, cookie: (await request.allHeaders()).cookie || "", headers: { Origin: origin } });
      return route.fulfill({ status: response.status, headers: Object.fromEntries(response.headers), body: JSON.stringify(response.data) });
    }
    const pathname = decodeURIComponent(url.pathname);
    const file = pathname.startsWith("/assets/") || pathname.startsWith("/images/") ? resolve(dist, "." + pathname) : resolve(dist, "index.html");
    assert.ok(file.startsWith(dist + "/"));
    const types = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml", ".png": "image/png", ".woff2": "font/woff2" };
    try { return route.fulfill({ status: 200, contentType: types[extname(file)] || "application/octet-stream", body: readFileSync(file) }); }
    catch { return route.fulfill({ status: 404, body: "missing test asset" }); }
  });
  const page = await context.newPage();
  page.setDefaultTimeout(10000);
  page.on("pageerror", error => pageErrors.push(error.message));
  await page.goto(origin + "/posts/outside-the-classroom");
  await page.getByText(account ? `已登录：${account.data.user.display_name}` : "访客可以点赞，评论和收藏需登录", { exact: true }).waitFor();
  await page.getByText("在线互动已连接", { exact: true }).waitFor();
  return { page, context, section: page.locator(".aleph-online") };
}
try {
  const guest = await openAccount();
  assert.equal(await guest.section.getByRole("button", { name: "撤回评论", exact: true }).count(), 0);
  assert.equal(await guest.section.getByRole("button", { name: "编辑评论", exact: true }).count(), 0);
  await guest.context.close();
  const unrelated = await openAccount(other);
  assert.equal(await unrelated.section.getByRole("button", { name: "撤回评论", exact: true }).count(), 0);
  await unrelated.context.close();

  const admin = await openAccount(owner);
  const { page, section } = admin;
  assert.equal(await section.getByRole("button", { name: "编辑评论", exact: true }).count(), 3);
  assert.equal(await section.getByRole("button", { name: "撤回评论", exact: true }).count(), 3, "No duplicate controls on the owner's own comment");
  const card = section.locator(".aleph-online__comment").filter({ has: page.locator("strong", { hasText: /^author$/ }) });
  await card.getByRole("button", { name: "编辑评论", exact: true }).click();
  await card.getByRole("textbox", { name: "编辑评论", exact: true }).fill("取消的草稿");
  await card.getByRole("button", { name: "取消编辑", exact: true }).click();
  assert.match(await card.innerText(), /作者的原始评论/);
  await card.getByRole("button", { name: "编辑评论", exact: true }).click();
  const editor = card.getByRole("textbox", { name: "编辑评论", exact: true });
  await editor.fill("   ");
  assert.equal(await card.getByRole("button", { name: "保存修改" }).isDisabled(), true);
  await editor.fill("博主修订后的评论\n第二行仍保留");
  if (output) await section.screenshot({ path: output + "/comments-edit-desktop.png" });
  failMethod = "PATCH";
  await card.getByRole("button", { name: "保存修改" }).click();
  await card.getByRole("alert").waitFor();
  assert.equal(await editor.inputValue(), "博主修订后的评论\n第二行仍保留");
  await card.getByRole("button", { name: "保存修改" }).click();
  await section.getByText("评论已更新", { exact: true }).waitFor();
  const editedCard = card;
  assert.match(await editedCard.innerText(), /author/);
  await editedCard.getByText("博主已编辑").waitFor();
  assert.equal(f.sqlite.prepare("SELECT body FROM comment WHERE id = ?").get(created.data.id).body, "博主修订后的评论\n第二行仍保留");
  if (output) await section.screenshot({ path: output + "/comments-owner-desktop.png" });
  await editedCard.getByRole("button", { name: "撤回评论", exact: true }).click();
  assert.equal(await page.getByRole("dialog").isVisible(), true);
  assert.equal(await page.getByRole("button", { name: "取消", exact: true }).evaluate(el => el === document.activeElement), true);
  const before = writes;
  await page.keyboard.press("Escape");
  assert.equal(await page.getByRole("dialog").count(), 0);
  assert.equal(writes, before, "Escape sends no withdrawal");

  await page.setViewportSize({ width: 390, height: 844 });
  await editedCard.getByRole("button", { name: "撤回评论", exact: true }).click();
  failMethod = "DELETE";
  await page.getByRole("button", { name: "确认撤回" }).click();
  await page.getByRole("dialog").getByRole("alert").waitFor();
  assert.equal(await editedCard.count(), 1, "Failed withdrawal keeps comment and confirmation");
  if (output) await page.screenshot({ path: output + "/comments-withdraw-mobile.png" });
  await page.getByRole("button", { name: "取消", exact: true }).click();
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `No overflow at ${width}px`);
    const button = editedCard.getByRole("button", { name: "撤回评论", exact: true });
    assert.equal(await button.isVisible(), true);
    assert.ok((await button.boundingBox()).height >= (width <= 640 ? 44 : 28));
    assert.equal(await button.innerText(), "", "Management controls use icons");
  }
  await page.evaluate(() => document.documentElement.classList.add("dark"));
  if (output) await section.screenshot({ path: output + "/comments-owner-dark.png" });
  await editedCard.getByRole("button", { name: "编辑评论", exact: true }).click();
  await editedCard.getByRole("textbox", { name: "编辑评论", exact: true }).fill("退出后不能泄露的草稿");
  await admin.context.clearCookies();
  await page.evaluate(() => window.dispatchEvent(new Event("focus")));
  await section.getByText("访客可以点赞，评论和收藏需登录", { exact: true }).waitFor();
  assert.equal(await section.getByRole("button", { name: "撤回评论", exact: true }).count(), 0);
  assert.equal(await section.getByRole("textbox", { name: "编辑评论", exact: true }).count(), 0, "Session change clears management drafts");
  await admin.context.close();

  const member = await openAccount(author, 390);
  assert.equal(await member.section.getByRole("button", { name: "编辑评论", exact: true }).count(), 0);
  assert.equal(await member.section.getByRole("button", { name: "撤回评论", exact: true }).count(), 1);
  if (output) await member.section.screenshot({ path: output + "/comments-author-mobile.png" });
  await member.section.getByRole("button", { name: "撤回评论", exact: true }).click();
  await member.page.getByRole("button", { name: "确认撤回" }).click();
  await member.section.getByText("评论已撤回", { exact: true }).waitFor();
  assert.equal(f.sqlite.prepare("SELECT id FROM comment WHERE id = ?").get(created.data.id), undefined);
  await member.page.reload();
  await member.page.getByText("在线互动已连接", { exact: true }).waitFor();
  assert.equal(await member.section.getByText("博主修订后的评论").count(), 0);
  await member.context.close();
  assert.deepEqual(pageErrors, []);
  console.log("Comments UI passed: guest/member/owner permissions, edit/cancel/retry, withdrawal confirmation/failure/persistence, keyboard focus/Escape, session-change cleanup, 320–1440px and dark mode. Uses production build, actual API handler and isolated SQLite D1 adapter.");
} finally {
  await browser.close(); f.sqlite.close();
}
