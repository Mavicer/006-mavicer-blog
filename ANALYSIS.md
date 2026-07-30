# 阶段一 / 二：aleph-null.cc 复刻分析与技术方案

> 目标：1:1 复刻 `aleph-null.cc` 的视觉、结构、交互、动效、响应式与代码架构，
> 完成后做成博主自己（Mavicer）的个人博客。静态前端 + 自建动态后端（评论/点赞/收藏/在线人数/管理 CMS）。

---

## 1. 页面树结构

```
<body>
└ page-container (#swup)                       ← Swup 切换容器
  ├ progress-bar-container / pjax-progress-bar  ← 顶部滚动进度条
  ├ home-banner-background (fixed, 全屏背景图)   ← 明/暗双图, scale-125 视差
  ├ home-banner-container (min-h-100vh hero)     ← 居中标题 + 打字机副标题 + 底部胶囊
  │   ├ .description
  │   │   ├ "Aleph_null's Blog" (2.8rem)
  │   │   └ #subtitle (Typed.js, 1.5rem)
  │   │   └ social-contacts (GitHub 毛玻璃胶囊)
  │   │   └ 向下滚动按钮 (圆, hover translate-y-1)
  │   └ scrollToMain()
  └ main-content-container (min-h-dvh, flex-col)
      ├ main-content-header
      │   └ navbar-container (sticky, 双色渐变 + 毛玻璃)
      │       ├ left: .logo-title (Chillax 1.7rem)
      │       └ right
      │           ├ desktop ul.navbar-list (gap 24px)
      │           │   ├ 首页 / 归档 / 关于▾(ME,GITHUB) / PROJECTS / 分类 / 标签
      │           │   └ search (magnifying-glass)
      │           └ mobile: search icon + navbar-bar (汉堡)
      │       └ navbar-drawer (抽屉) + window-mask
      ├ main-content-body (transition-fade-up)
      │   ├ home-sidebar-container (left, 240px, sticky top 70px)
      │   │   ├ sidebar-links (圆角18, 阴影)
      │   │   │   ├ site-info (second-bg, 站名 + announcement)
      │   │   │   └ links: About/Archives/Projects/Categories/Tags
      │   │   └ sidebar-content (avatar + author + Lv1 + 统计计数)
      │   └ main-content (article list / page template)
      │       └ home-content-container
      │           └ ul.home-article-list > li.home-article-item ×N
      │               ├ h3.home-article-title > a
      │               ├ .home-article-content.markdown-body (excerpt)
      │               └ home-article-meta-info (date / category / tags / 阅读全文)
      └ main-content-footer
          └ footer
              ├ 自定义信息 "个人网站正在持续更新。"
              ├ © 2026 - 2026 ❤️ Aleph_null
              ├ post-count (共 N 篇 / N 字)
              ├ busuanzi 访问人数/总访问量 (右, vercount)
              ├ "由 Hexo 驱动" + "主题 Redefine v2.8.2" (左)
              └ 运行天数 odometer (天/时/分/秒)

  右下角 right-side-tools-container:
    ├ 隐藏组: 字号+/−, 明暗, 滚动到底
    └ 可见组: cog(展开), scroll-to-top(↑ + 百分比)

  image-viewer-container (全屏图片查看)
  search-pop-overlay (搜索弹窗)
```

**页面清单（路由）**：
- `/` 首页（banner + 文章列表）
- `/archives` 归档（按年分组时间线）
- `/about` 关于（简历）
- `/projects` 作品集
- `/categories` 分类页（标签云样式）
- `/tags` 标签页（blur 标签云）
- `/posts/:slug` 文章详情（TOC + 正文 + 评论/点赞/收藏）
- `/login` `/register` 登录注册
- `/account` 账户中心（我的收藏）
- `/admin` 管理后台（文章 CRUD + 评论管理 + 统计）

---

## 2. 视觉分析

### 颜色（CSS 变量，亮/暗双套）

| token | light | dark |
|---|---|---|
| `--background-color` | `#fff` | `#202124` |
| `--background-color-transparent` | `rgba(255,255,255,0.6)` | `rgba(32,33,36,0.4)` |
| `-transparent-80` | `rgba(255,255,255,0.8)` | `rgba(32,33,36,0.8)` |
| `--second-background-color` | `#fafafa` | `#242529` |
| `--third-background-color` | `#f7f7f7` | `#292b2f` |
| `--primary-color` | `#a31f34` | `#a31f34` （深红，不随主题变）|
| `--first-text-color` | `#323739` | `#d2d2d7` |
| `--second-text-color` | `#343a3c` | `#cbcbd1` |
| `--third-text-color` | `#5c6669` | `#9595a2` |
| `--default-text-color` | `#373d3f` | `#bebec6` |
| `--border-color` | `rgba(0,0,0,0.08)` | `rgba(255,255,255,0.08)` |
| `--selection-color` | `#be243c` | `#be243c` |
| `--shadow-color-1` | `rgba(0,0,0,0.08)` | `rgba(255,255,255,0.08)` |
| `--shadow-color-2` | `rgba(0,0,0,0.05)` | `rgba(255,255,255,0.05)` |
| `--home-banner-text-color` | `#fff` | `#d1d1b6` |

**关键组合阴影**：
- `--redefine-box-shadow`: `0 6px 24px shadow-2, 0 0 0 1px shadow-1`
- `--redefine-box-shadow-hover`: 同上 + inset 1px shadow-1
- `--redefine-box-shadow-flat`: `0 1px 4px shadow-2, 0 0 0 1px shadow-1`（卡片常态）
- `--redefine-box-shadow-flat-hover`: + inset 1px

**渐变**：
- navbar 背景 `linear-gradient(120deg, rgba(247,135,54,0.208) 0%, rgba(54,125,247,0.208) 100%)` + `backdrop-blur(10px)`（橙→蓝半透明）
- 进度条彩虹 `linear-gradient(45deg, #f10006, #ef5b00, #e59c01, #19ca05, #00cab5, #0264c8, #c303c3)`

### 字体

- 标题/导航/banner：**Chillax-Variable**（fontshare，可变字重 200–700，标题用 520/600/700）
- 正文/文章：**Geist Variable**（Vercel，可变 200–700，正文 16px / line-height 1.7）
- 代码：**Geist Mono**
- 中文降级链：Noto Sans SC → PingFang SC → Microsoft YaHei → Heiti SC

**字号体系**：
- banner 标题 `2.8rem` / 副标题 `1.5rem`
- logo `1.7rem` weight 520
- navbar `1rem` weight 500
- 文章标题 `1.4rem` weight 600 line-height 1.5
- 正文 `16px` line-height 1.7
- meta `0.92rem` third-text-color
- announcement `0.9rem`
- 标签 `0.82rem`
- 大数字（统计）`text-2xl`

### 布局

- navbar 宽度：首页 `1200px` / 内容页 `1000px`（`max-width` 随滚动 `navbar-shrink` 切换）
- 内容最大宽度 `1000px`（`--content-max-width`）
- 侧栏 `240px`，margin `0 38px`，sticky top `70px`
- 卡片圆角 `18px`（sidebar/article）；按钮 `12px`；标签 `9px/999px`
- 文章列表 `margin-bottom 38px`
- 间距单位多用 `38px`（横向）、`30px`、`2.5rem`（纵向 my）

### 圆角 token
- `--redefine-border-radius`（卡片 18px 区域）、`border-radius: 18px / 12px / 9px / 999px`

---

## 3. 动效分析

| 动画 | 触发 | 时长 | 缓动 | 实现 |
|---|---|---|---|---|
| 首页进入淡入 | DOMContentLoaded | 0.4s | ease | `.transition-fade { opacity 0→1, transition 0.4s }` |
| banner 文字下移淡入 | 进入 | transform translateY 0.4s + opacity 0.4s | ease | `.transition-fade-down` |
| 内容上移淡入 | 进入 | translateY 0.4s + opacity 0.4s | ease | `.transition-fade-up` |
| 副标题打字机 | 进入 | typing 100ms/字, backspace 80ms/字, loop | — | Typed.js (`smart_backspace`) |
| 背景视差 scale | 进入/滚动 | — | will-change transform | `scale-125 sm:scale-110` 静态放大 |
| 卡片 hover | hover | 0.2s | ease(linear transform) | box-shadow + transform transition |
| 向下按钮 hover | hover | — | transition-transform | `translate-y-1` |
| navbar shrink | 滚动 | 0.3s | ease | max-width + height 切换，`navbar-shrink` class |
| 进度条 | 滚动 | — | — | 顶部 `.pjax-progress-bar` 宽度随 scrollTop |
| 明暗切换 | 点击 | 0.2s | ease | 整页 transition + 图标切换 |
| cog 旋转 | 常驻 | — | — | `fa-spin` |
| footer ❤️ beat | 常驻 | 0.5s | — | `fa-beat` `--fa-animation-duration` |
| odometer 滚动数字 | 运行天数变化 | 200ms | — | Odometer.js |
| Swup 页面切换 | 路由 | 0.4s | slide theme | SwupSlideTheme |
| 文章图片懒加载 | 滚动进入视口 | — | — | IntersectionObserver |
| 在线人数药丸 | 30s 心跳 | — | — | POST /online/ping → 左下角 dock |
| 账户胶囊 | 登录态 | — | — | 右下角固定 dock |

**Swup 配置**：`containers: ["#swup"]`，`SwupScrollPlugin offset 80`，`mainElement: ".main-content-body"`。

---

## 4. 图片与资源

| 资源 | 来源 | 处理 |
|---|---|---|
| `wallhaven-wqery6-light.webp` / `-dark.webp` | 原站背景图 | **复刻版用渐变/纯色占位**（你之后换自己的图）；已下载原文件作为参考与降级 |
| `avatar.jpg` | 原站头像 | 占位，你换 |
| `favicon.svg` | 原站 | 用占位 SVG |
| `redefine-og.webp` | OG 图 | 占位 |
| FontAwesome 图标 | CDN | 直连 jsdelivr CDN（与原站一致）|
| Chillax / Geist / GeistMono | fontshare / Vercel | 优先用 CDN @font-face；降级 system-ui |
| 数学公式 | MathJax v3 | jsdelivr CDN，按需 typeset |

---

## 5. 技术方案（阶段二）

### 前端
- **React 18 + TypeScript + Vite**
- **Tailwind CSS v3**（含 `darkMode: 'class'`，自定义 `--background-color` 等 CSS 变量映射到 `tailwind.config`）
- **Framer Motion**：页面进入/退出、卡片淡入、banner 文字动效
- **react-router-dom v6**：替代 Swup 做客户端路由（更 React 原生，可保留淡入过渡）
- **lucide-react** + **FontAwesome CDN**（图标双轨：lucide 用于代码内，FontAwesome 用于还原原站 `fa-*` 类名细节）
- **marked + highlight.js / KaTeX**：Markdown 渲染（原站用 marked + MathJax，这里用 KaTeX 更轻，但保留 MathJax 选项）

### 后端
- **FastAPI + SQLite + SQLModel**（与原站推断一致：Pydantic schema 完全对齐 OpenAPI）
- **python-jose (JWT) + passlib (bcrypt)**
- 端点 1:1 对齐 `/api/openapi.json` 的 22 个路径
- **Owner Key 机制**：`OWNER_KEY` 环境变量，注册时携带且匹配即提权 `is_owner=True`
- 图片上传存 `backend/uploads/`，静态服务

### 目录结构
```
006/
├ site.config.ts              ← 单一身份信息源（你改这里）
├ ANALYSIS.md
├ frontend/
│  ├ public/images/
│  ├ src/
│  │  ├ components/           ← Navbar, Footer, Sidebar, RightTools, SearchPopup, ImageViewer, AccountDock, ReaderDock, ThemeToggle, Progressbar
│  │  ├ sections/             ← HomeBanner, ArticleList, ArchiveList, TagCloud, CategoryList, Projects, About, ArticleDetail, AuthPage, AccountPage, AdminConsole
│  │  ├ pages/                ← 路由页：Home, Archives, About, Projects, Categories, Tags, PostDetail, Login, Register, Account, Admin
│  │  ├ animations/           ← variants, transitions
│  │  ├ hooks/                ← useTheme, useOnlineReaders, useAuth, usePosts
│  │  ├ lib/                  ← api client, markdown render, swup-like router transition
│  │  ├ data/                 ← 本地静态 markdown 文章（占位示例）
│  │  ├ styles/               ← index.css (CSS 变量), tailwind 入口
│  │  └ utils/
│  ├ tailwind.config.ts
│  └ vite.config.ts
└ backend/
   ├ main.py
   ├ api/                     ← auth, posts, comments, interactions, admin, analytics, online, uploads
   ├ models.py / schemas.py / deps.py / security.py
   └ uploads/
```

### 实施顺序
1. 全局 Layout + CSS 变量 + Tailwind 主题
2. Navbar（含 shrink / 抽屉 / 搜索触发）
3. Hero Banner（背景 + 标题 + 打字机 + 胶囊）
4. Sidebar（站点信息 + 头像 + 统计 + 链接）
5. 文章列表 + 卡片
6. Footer + 右下工具栏 + 进度条
7. 各子页面（归档/标签/分类/项目/关于）
8. 文章详情（Markdown + TOC + 代码高亮 + LaTeX）
9. 后端 FastAPI（22 端点）
10. 前端动态功能（评论/点赞/收藏/在线人数/账户/管理后台）
11. 响应式 + 暗色模式 + 动效打磨
12. 构建验证 + 类型检查 + 无 console 错误

### 与原站已知差异（诚实记录）
- 用 react-router 替代 Swup（过渡效果用 Framer Motion 复刻，行为等价）
- 背景图用占位渐变（原站用 wallhaven 摄影图，你换自己的）
- 静态文章改用本地 Markdown（原站静态文章 1 篇 + 在线 7 篇，复刻版统一本地源，可选连后端在线发布）
- 站名为 "Mavicer's Blog"，作者 Mavicer，南航 AI 专业
