# Mavicer's Blog

React + Vite 前端，Cloudflare Pages Functions + D1 后端。文章从 GitHub 仓库中的 Markdown 构建，公开页面预渲染为 HTML，浏览器通过 React Hydration 接管；点赞支持访客，评论和收藏使用服务器账号登录。

## 本地运行

使用 Node.js 22.22.2+（或 24.15+、26+；版本固定见 frontend/.node-version）（测试使用内置 SQLite）：

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
早期 FastAPI 与浏览器 localStorage 文章服务已退出生产并移除；历史版本可从 Git 历史查阅。

## 写文章与构建

在 `frontend/src/data/posts/` 添加带 frontmatter 的 Markdown。用 `npm run build`
构建；生成脚本会同时建立前端文章与 API 所需的 slug/元数据清单。
新增文章无需向 D1 的 `post` 表重复录入。`published: false` 的静态文章不会发布。
已有文章不要修改 slug。新增文章后重新构建即可同步页面、API 清单与 Sitemap。

```bash
npm run typecheck
npm test
npm run build
```

后端类型检查已包含在构建中；回归测试在 SQLite 上运行真实处理函数与 SQL，
覆盖账号隔离、会话失效、权限、历史数据兼容和失败后的迁移重试。

评论浏览器回归：构建后运行 `npm run test:comments-ui`（需要本机 Chrome，或用
`PLAYWRIGHT_CHANNEL` 指定已安装的浏览器）。脚本渲染生产构建，调用真实 API
处理函数和隔离 SQLite D1 适配器，覆盖编辑、撤回、失败重试、三种身份、键盘操作、
手机布局及深色模式；不访问线上数据库。可通过 `COMMENTS_SCREENSHOT_DIR` 保存截图。

## 访问统计

页脚左侧显示累计访问次数与当前在线人数，替代原有驱动与主题信息；手机端居中。`GET /api/visits` 只读取数据，
`POST /api/visits` 处理开始、有效浏览和在线心跳；不再使用 Cloudflare HTTP 流量汇总。
累计数在 D1 中一次性初始化为 650，重新构建、重复迁移与部署不会重置。

页面进入前台即计入在线人数；累计访问仍需前台累计停留满 10 秒，后台时间暂停累计。
服务器记录开始时间并验证至少经过 10 秒。此门槛与已知机器人过滤只是减少噪声，
不构成真人身份证明。相同浏览器、相同页面在 30 秒内的快速刷新合并，
事件 ID 防止上报重试重复计数；普通回访和不同页面可以继续增加累计数。
浏览器使用 30 分钟的同源 HttpOnly Cookie，共享标签页的在线标识。
进入页面立即登记在线，之后每 10 秒心跳并自动同步在线人数，无需手动刷新。
最近 90 秒有心跳视为在线；后台页面停止发送心跳，返回前台立即重新同步。

预览域名和账号管理页面不上报；正式域名白名单在 `frontend/server/visits.ts`。
新增表使用独立名称，不读取或覆盖旧 `visits_cache`。事件明细保留一天，
短期在线和待确认记录在后续请求时清理，累计数字单独永久保存。
统计故障保留已经读取的累计值，在线显示破折号并允许重试，不伪造为零。

## 账号与互动

- `/register`：用户名、密码和公开昵称。用户名 2–30 个中文、字母、数字或下划线，不区分英文大小写；密码 8–128 字符且同时包含字母和数字。管理员凭据由运维在数据库中单独配置，登录使用同一套加盐哈希核验。
- `/login`：登录后返回原文章，或进入 `/account`。
- `/account`：我的收藏、取消收藏、修改密码、退出登录。收藏绑定账号，可跨设备读取。
- 点赞保持匿名，使用浏览器标识去重；它不作为身份验证凭据。
- 所有人可以阅读评论；发表评论需要登录。作者可撤回自己的评论，博主可编辑或撤回任意评论。桌面与手机均显示带悬停提示的图标操作入口，撤回前需确认，撤回后无法恢复。
- 编辑仅修改正文，保留原作者、发布时间及账号归属；正文限制为 1–3000 字符。编辑或撤回失败时保留草稿或原评论，可重试。
- 旧匿名评论无法绑定到账号，仅博主可管理。评论编辑复用现有 `updated_at` 列，无需新增数据库迁移。
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
回滚代码不会删除新增账号和收藏表；不要向正式库导入历史 seed 数据。基础 schema 仅供空数据库初始化。

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
文章管理以 GitHub Markdown 为唯一来源，不再用旧 localStorage 文章覆盖正式内容。

## 管理员在线发布

管理员在首页点击“发布文章”，或进入 `/admin` 管理文章；文章页提供“编辑文章”。
`/admin/articles/new` 接受纯文本，保留空行分段，将段内换行接成自然段，转义 Markdown
特殊符号，不自动改写原文。切换 Markdown 模式可以直接编辑标题、列表与代码。
编辑已有文章会读取 GitHub 最新文件，保留原始日期与额外 frontmatter 字段。
预览使用与文章页相同的 Markdown 渲染和 HTML 清洗。草稿只暂存在当前设备。

在 Cloudflare Pages 项目 `blog` 的 Production Secret 配置
`GITHUB_PUBLISH_TOKEN`，然后重新部署。使用仅限 `Mavicer/006-mavicer-blog`
的 fine-grained GitHub token，仓库权限为 Contents: Read and write（自动附带 Metadata: Read）；
公开仓库的部署检查可读取公开 API，不需要仓库管理、Actions 或 Checks 写权限。
令牌到期前由管理员轮换，勿粘贴到文章、聊天或提交中。
本地开发可在被忽略的 `frontend/.dev.vars` 中配置同名变量。

发布接口仅允许数据库标记的管理员调用；仓库、`main` 分支和文章目录由服务器固定。
提交使用 GitHub 原文件 SHA 防止覆盖其他更改，D1 记录请求 UUID 防止重复点击，
并用限时租约串行提交。请求结果不明确时先查询 GitHub 文件与提交记录，再决定是否允许重试。
每小时最多 30 次新发布，不使用浏览器传来的角色或 GitHub 令牌。

状态分为等待提交、核实中、已提交、部署中、已上线或失败。构建会生成不缓存的
`/_publication.json`，只有正式站标记包含文章的精确文件 SHA 才显示“已上线”。
GitHub 提交成功不代表上线；Cloudflare 失败时保留提交链接与草稿供排查。
新版本在其他标签页查看，已经打开的旧页面需刷新。GitHub 历史可用于恢复文章。
发布记录按账号保存在 D1；不要删除记录或锁表来强行重试未确认的提交。

## 目录

- `frontend/functions/api/[[path]].ts`：路由、文章和互动接口
- `frontend/server/`：账号、会话、迁移、同源与限流
- `frontend/src/pages/`：注册、登录、账户及页面
- `frontend/scripts/generate-static-posts.mjs`：构建时公开文章清单
- `frontend/scripts/prerender.mjs`：静态 HTML、Sitemap 和 robots
- `frontend/shared/seo.ts`：公开 URL、逐页元数据与 JSON-LD
- `frontend/functions/_middleware.ts`：预览域名 noindex、私有 SPA 入口与历史文章路由
- `docs/history/initial-design.md`：已归档的早期设计记录
- `frontend/tests/interactions.test.mjs`：真实 SQL 回归测试
- `backend-worker/schema.sql`：首次创建旧基础表（仅用于空数据库初始化）

## Projects 作品展廊

- 编辑 `frontend/src/data/projects.ts` 维护项目介绍、技术标签与体验地址；不要把未提供的功能写成已上线成果。
- 封面与按需加载的演示位于 `frontend/public/images/projects/`，来源记录见该目录 README。VisualLab 动画使用合成观测点，卡片进入视口时循环播放，可手动暂停并遵循系统减少动态效果设置。Nexus 封面为本地运行并加载项目演示数据后的真实首页截图。
- `/api/projects` 继续提供缓存后的 GitHub 统计。作品资料独立于接口，失败时仍可浏览；新增公开仓库会显示在「更多公开仓库」。
- 验证：先在 `frontend/` 执行 `npm run build`，再执行 `npm run test:projects-ui`。浏览器回归使用本机 Chrome，自动在 `127.0.0.1:5191` 启停预览；可通过 `PLAYWRIGHT_CHANNEL` 更换已安装浏览器通道。


## SEO 与静态页面

构建顺序为 Markdown 清单 → TypeScript 检查 → Vite 浏览器资源 → React 服务端构建 → 公开页面 HTML。
不需要生产凭据或 D1 数据；服务端构建产物保存在被忽略的临时目录，完成后删除，只有 `dist/` 进入部署。
`jsdom` 只用于构建与测试的 DOMPurify 清洗，不进入浏览器 Bundle 或 Pages Functions。
框架仍是 React + Vite，无常驻 SSR 服务。文章与页面共用原组件，React 在构建时等待组件完成，浏览器预先加载当前文章组件，再通过 `hydrateRoot` 接管已有内容；首次公开渲染不保留会被主题/账号状态打断的待接管 Suspense 边界。

首页、归档、分类及其详情、标签及其详情、About、Projects 和已发布文章自动进入 Sitemap。
`/login`、`/register`、`/account`、`/admin/*`、反馈及尚未上线的展示页不参与索引。
私有入口在服务器返回的 HTML 和响应头中设置 noindex；权限仍由服务端账号系统核验。
未知 URL 返回真正的 404；历史已发布 D1-only 文章仍使用原 SPA/API 兼容入口，不删除或改写数据库。
目前正式站的公开文章全部来自仓库 Markdown。预览域名返回 `X-Robots-Tag: noindex`，robots 禁止抓取，canonical 始终使用 `https://mavicer.cc`。
不按 User-Agent 区分正文。Cloudflare 控制台的 Managed robots 可能在仓库生成的内容前附加爬虫策略，独立于本仓库维护。

文章 frontmatter 使用原始 `date`，实质修改正文时更新 `updated_at`（`YYYY-MM-DD` 或含时区的 ISO 时间）。
lastmod 优先使用 `updated_at`，没有显式更新时间时使用完整 Git 历史中该源文件的最后提交时间。
浅克隆、未提交文件或无法查到可靠历史时省略 lastmod，不取构建时间、文件 mtime，也不把发布日期当成修改日期。
后台在线编辑会在服务端记录真实的 `updated_at`，同时保留原始 `date`；本地编辑时由作者维护该字段。
新发布或修改文章经过同一个构建入口，自动更新 HTML、Sitemap、结构化数据及上线版本标记。
草稿 `published: false` 在生成 HTML、公开目录和浏览器数据前即被过滤；API 还会拒绝其 slug，即使 D1 留有旧的 published 行。

验证命令（在 `frontend/`）：

```bash
npm test
npm run build
npm run test:seo-ui
npm run test:comments-ui
npm run test:projects-ui
```

SEO 浏览器回归依赖已安装的 Chrome，测试使用本地 Pages 与本地 D1，不向正式库写入。
生产 Pages 项目仍为 `blog`，Git 集成监听 `main`；合并后 Cloudflare 自动执行 `npm run build` 并发布 `dist` 与 Functions。
上线后检查 `/sitemap.xml`、`/robots.txt`、`/posts/welcome` 的初始 HTML、随机不存在路径的 404，以及 `/api/health`。
回滚使用 Cloudflare Pages 的历史部署或回退 Git 提交，不回滚数据库记录。

## 本次技术债清理边界

`backend/` 的 FastAPI 实现、`frontend/src/services/articlesService.ts` 的 mock CMS 和无人调用的旧文章 `backend-worker/seed.sql` 已移除。
依赖核查覆盖 package scripts、测试、Functions、发布链路和文档；移除不执行任何正式数据库操作。
`backend-worker/schema.sql` 仍被 `db:local` 和 SQLite 回归测试使用，因此保留原路径与兼容字段。
`frontend/server/schema.ts` 的生产增量迁移、旧匿名互动表、D1-only 文章兼容逻辑、图库管理入口及浏览器草稿均保留。

GitHub Actions 在 PR 和 main 提交上运行隔离 SQLite 回归及完整构建（包括类型检查与预渲染），不使用生产 Secrets。
