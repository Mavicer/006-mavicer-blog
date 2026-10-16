# Mavicer's Blog

React + Vite 前端，Cloudflare Pages Functions + D1 后端。文章从 Markdown
加载；点赞支持访客，评论和收藏使用服务器账号登录。

## 本地运行

使用 Node.js 22.13+（测试使用内置 SQLite）：

```bash
cd frontend
npm ci
npm run db:local
npm run build
npm run dev:api
# http://localhost:8788，包含完整 API 和本地 D1
```

如需前端热更新，另开终端在 `frontend/` 运行 `npm run dev`。
Vite 将 `/api` 代理到 8788 的同一套 Pages 后端。本地 D1 与线上数据库隔离。
`backend/` 是早期 FastAPI 实现，当前部署不使用它。

## 写文章与构建

在 `frontend/src/data/posts/` 添加带 frontmatter 的 Markdown。用 `npm run build`
构建；生成脚本会同时建立前端文章与 API 所需的 slug/元数据清单。
新增文章无需向 D1 的 `post` 表重复录入。`published: false` 的静态文章不会发布。
新增或修改 slug 后，需要重新运行生成步骤或重启开发服务。

```bash
npm run typecheck
npm test
npm run build
```

后端类型检查已包含在构建中；回归测试在 SQLite 上运行真实处理函数与 SQL，
覆盖账号隔离、会话失效、权限、历史数据兼容和失败后的迁移重试。

## 账号与互动

- `/register`：用户名、密码和公开昵称。用户名 3–30 个字母/数字/下划线，不区分大小写；密码 12–128 字符。
- `/login`：登录后返回原文章，或进入 `/account`。
- `/account`：我的收藏、取消收藏、修改密码、退出登录。收藏绑定账号，可跨设备读取。
- 点赞保持匿名，使用浏览器标识去重；它不作为身份验证凭据。
- 所有人可以阅读评论；发表评论需要登录，作者可删除自己的评论，管理员可删除所有评论。
- 不接邮件。忘记密码时联系博主；管理员核实用户身份后在 `/admin/users` 重置。临时密码只返回一次，用户登录后必须更改。

密码使用原生 scrypt（N=16384、r=8、p=5、随机盐）散列，不储存明文。
登录令牌为随机 256 位值；D1 只保存 SHA-256 摘要。Cookie 是 host-only、
HttpOnly、Secure、SameSite=Lax，有效期 30 天。退出立即撤销当前会话；
修改或重置密码撤销该账号所有会话。客户端不保存令牌或信任 localStorage 中的角色。

写接口校验同源 Origin 和 JSON 类型，并限制请求体大小。注册/登录/密码操作、
评论和点赞有基于 D1 的原子计数限流。接口响应不缓存；异常返回 503 和请求编号，
服务器日志记录故障位置，不记录密码、Cookie 或请求体。

## 部署与历史数据

Pages 项目根目录为 `frontend`，构建命令 `npm run build`，输出目录 `dist`。
D1 绑定名为 `DB`，数据库 ID 在 `frontend/wrangler.toml` 中。
当前会话机制无需 JWT 密钥或邮件服务。

首次请求会执行 `frontend/server/schema.ts` 中的增量迁移，建立账号、会话、
账号收藏、限流表，并为评论增加可空的 `user_id`。迁移有数据库版本标记，
只有成功完成才标记；中途失败可重试，不删除原表或原记录。

旧评论继续公开展示，但不允许用原来的 browser client_id 冒领。旧匿名收藏保留
历史总数，不迁移到任意账号；新的收藏保存在 `account_favorite` 中。
点赞数据沿用原表。升级前后的旧版前端可能存在短暂缓存差异，刷新页面可更新。

健康检查：`GET /api/health` 应返回 `200 {"ok":true}`。未登录访问
`/api/auth/me`、`/api/me/favorites` 或发表评论返回 401 是预期行为。
观察 Cloudflare 日志中的 `api_error` 与 requestId 可排查数据库/运行时故障。
后续结构性改动前，先使用 Cloudflare D1 的导出或 Time Travel 功能留存恢复点。
回滚代码不会删除新增账号和收藏表；不要通过重跑旧 seed.sql 覆盖真实数据。

### 初始化博主账号

公共注册始终创建普通用户，不接受 owner_key、is_owner 或“第一个注册者自动成为管理员”。
博主先在正式站自行注册，然后由数据库操作员在 Cloudflare D1 Console 核对其 ID
并执行以下语句（用真实 ID 替换占位内容，不要按不可信昵称提升权限）：

```sql
SELECT id, username, is_owner FROM blog_user ORDER BY created_at;
UPDATE blog_user SET is_owner = 1 WHERE id = 'verified-owner-user-id';
```

刷新账户页后出现“账号管理”。普通用户没有此权限。正式站与预览域名的 Cookie
相互隔离；当前 Pages 预览共享同一个 D1 绑定，勿在预览发布真实测试评论。
文章/图库的旧本地 CMS 仍是浏览器本地草稿工具，此次账号改动不将它升级为服务器 CMS。

## 目录

- `frontend/functions/api/[[path]].ts`：路由、文章和互动接口
- `frontend/server/`：账号、会话、迁移、同源与限流
- `frontend/src/pages/`：注册、登录、账户及页面
- `frontend/scripts/generate-static-posts.mjs`：构建时文章清单
- `frontend/tests/interactions.test.mjs`：真实 SQL 回归测试
- `backend-worker/schema.sql`：首次创建旧基础表（仅用于空数据库初始化）
