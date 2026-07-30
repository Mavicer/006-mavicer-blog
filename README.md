# Mavicer's Blog — aleph-null.cc 复刻版

> 1:1 复刻 [aleph-null.cc](https://aleph-null.cc) 的视觉、结构、交互与后端 API，改成你自己的个人博客。

## 快速开始

### 前端（开发服务器）

```bash
cd frontend
npm install
npm run dev
# → http://localhost:5173
```

### 后端（FastAPI）

```bash
cd backend
uv venv .venv
uv pip install -e . --python .venv/bin/python
.venv/bin/uvicorn main:app --reload --port 8000
# → http://localhost:8000/api/docs  (Swagger UI)
```

前端通过 Vite 代理 `/api` → `http://127.0.0.1:8000`，所以两边都开着即可。

## 项目结构

```
006/
├ site.config.ts              ← 站点身份信息（改这里就能换名字/简介/邮箱）
├ ANALYSIS.md                 ← 原站分析与技术方案文档
├ frontend/
│  ├ public/images/            ← 头像、背景图、favicon、OG 图
│  ├ src/
│  │  ├ components/            ← Navbar, Footer, Sidebar, SearchPopup, ImageViewer,
│  │  │                          ArticleCard, AccountDock, ReaderDock, ProgressBar,
│  │  │                          RightSideTools, Layout, PageShell
│  │  ├ sections/             ← HomeBanner, Sidebar
│  │  ├ pages/                ← Home, Archives, About, Projects, Categories, Tags,
│  │  │                          PostDetail, Login, Register, Account, Admin, NotFound
│  │  ├ hooks/                ← useTheme, useAuth, usePosts, useScroll, useTypedSubtitle
│  │  ├ lib/                  ← api.ts (后端客户端), markdown.ts (渲染), highlight.ts
│  │  ├ config/               ← site.ts, nav.ts
│  │  ├ data/posts/           ← 本地 Markdown 文章
│  │  ├ styles/               ← index.css (CSS 变量 + 组件), fonts.css, highlight.css
│  │  └ main.tsx, App.tsx
│  ├ tailwind.config.ts        ← 原站 CSS 变量映射到 Tailwind 工具类
│  └ vite.config.ts           ← /api 代理 + chunk 拆分
├ backend/
│  ├ main.py                   ← FastAPI 入口，22 个端点
│  ├ db.py                     ← SQLModel 模型 + SQLite
│  ├ schemas.py                ← Pydantic 请求/响应模型（对齐原站 OpenAPI）
│  ├ security.py               ← JWT + argon2 密码哈希 + Owner Key
│  ├ deps.py                   ← 认证依赖（require_user / require_owner）
│  ├ api/                      ← health, auth, posts, comments, interactions,
│  │                          admin, analytics, online, uploads
│  ├ pyproject.toml
│  └ .env.example              ← BLOG_SECRET_KEY / OWNER_KEY
```

## 技术栈

**前端**：React 18 + TypeScript + Vite + Tailwind CSS v3 + Framer Motion
**后端**：FastAPI + SQLModel + SQLite + JWT (python-jose) + argon2
**字体**：Chillax（标题）、Geist（正文）、Geist Mono（代码）— jsdelivr CDN
**图标**：FontAwesome 6 CDN + lucide-react
**Markdown**：marked + highlight.js + KaTeX

## 关键特性

### 前端
- **1:1 视觉复刻**：原站的所有 CSS 变量、圆角、阴影 token、字体栈、明暗双主题
- **Hero Banner**：全屏背景图 + 打字机副标题 + 向下滚动按钮 + 社交胶囊
- **Navbar**：双色渐变毛玻璃、sticky、滚动收缩、移动端抽屉、搜索弹窗
- **Sidebar**：站点信息 + 头像 + 统计计数 + 链接
- **文章系统**：本地 Markdown frontmatter、代码高亮（mac 风格）、LaTeX、TOC 目录、图片查看器
- **动态功能**：评论 / 点赞 / 收藏 / 在线人数药丸 / 账户中心 / 管理后台 CMS
- **响应式 + 暗色模式**：跟随系统偏好，可手动切换

### 后端
- **22 个 API 端点**，与原站 `/api/openapi.json` 完全对齐
- **Owner Key 机制**：注册时携带正确的 `OWNER_KEY` 环境变量即成为管理员
- **JWT 认证**：30 天有效期，localStorage 存 token
- **SQLite**：零配置，`blog.db` 自动创建
- **图片上传**：`/admin/uploads`，存 `backend/uploads/`，静态服务

## 如何个性化

1. **改名字/简介/邮箱**：编辑 `site.config.ts`
2. **写文章**：在 `frontend/src/data/posts/` 放 Markdown 文件（带 frontmatter）
3. **换头像/背景图**：替换 `frontend/public/images/` 下的文件
4. **改导航**：编辑 `frontend/src/config/nav.ts`
5. **设管理员密钥**：复制 `backend/.env.example` → `backend/.env`，设 `OWNER_KEY`
6. **注册管理员**：在 `/register` 页面用设好的 Owner Key 注册

## 与原站差异

| 项 | 原站 | 复刻版 |
|---|---|---|
| 前端框架 | Hexo 静态生成 + Swup | React SPA + react-router |
| 后端 | FastAPI（推断） | FastAPI（22 端点 1:1 对齐） |
| 文章源 | 静态 1 篇 + 在线 7 篇 | 本地 Markdown + 后端在线 |
| 背景图 | wallhaven 摄影图 | 占位图（你换自己的） |
| 字体加载 | 自托管 woff2 | jsdelivr CDN |
| 页面切换 | Swup | Framer Motion |

## 构建

```bash
cd frontend && npm run build   # → dist/
```

产物：5 个 JS chunk + 1 个 CSS，gzip 后约 240KB（不含 KaTeX 字体）。
