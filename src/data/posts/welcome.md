---
title: "欢迎来到我的 Blog"
date: "2026-07-26"
category: "随笔"
tags: ["公告", "博客"]
excerpt: "关于这个站点的诞生、设计思路与技术选型——一个 React 驱动的 Hexo Redefine 主题复刻。"
published: true
sort_order: 40
---

欢迎来到我的个人博客。

这个站点最初的想法很简单：在 AI 时代，拥有一个属于自己的、可以自由表达的空间，比以往任何时候都重要。社交平台太喧嚣，笔记应用太封闭，而一个独立的博客，是知识沉淀和个人品牌建设的最佳载体。

## 为什么自己搭

市面上有无数博客平台——知乎、掘金、Medium、Notion——但它们都有一个共同的问题：你的内容住在别人的服务器上，受制于别人的规则、排版和算法。当平台衰落时，你的文字也随之消失。

自己搭建意味着：

- **完全的数据主权**——文章是本地 Markdown 文件，随时可以迁移
- **完全的视觉控制**——每个像素都由自己决定
- **完整的技术学习**——从前端到后端到部署，一个项目串起全栈能力

## 视觉设计

这个站点的视觉灵感来自 [Aleph_null](https://aleph-null.cc) 的 Hexo + Redefine 主题博客。我非常喜欢它那种极简、克制、又带着一点温度的风格——没有花哨的动画干扰阅读，但每一个交互细节都经过打磨。

复刻过程中重点还原了这些细节：

- **昼夜自动背景**：根据当前时间（06:00–18:00 白天，18:00–06:00 夜间）自动切换背景图片和配色，也可以手动覆盖
- **打字机副标题**：首页 hero 区域的副标题逐字打出，使用 `Typed.js` 风格的智能回删
- **滚动视差模糊**：首页背景随滚动渐进式模糊，营造空间纵深感
- **导航栏收缩**：滚动时导航栏高度平滑收缩，内容区宽度同步收窄
- **右下角工具栏**：回到顶部（带实时百分比）、字号调节、明暗切换、搜索，从折叠按钮向下展开
- **Footer 运行时计数器**：滚动数字动画，精确到秒

## 技术栈

| 层 | 技术 | 说明 |
|---|---|---|
| 前端框架 | React 18 + TypeScript | SPA，BrowserRouter |
| 构建工具 | Vite 5 | 极速 HMR |
| 样式 | Tailwind CSS v3 + 原生 CSS 变量 | 主题变量驱动昼夜切换 |
| 动画 | Framer Motion | 页面切换淡入上滑 |
| Markdown | marked + highlight.js + KaTeX | 代码高亮、数学公式、TOC、图片查看器 |
| 字体 | Chillax + Geist Variable | 标题用 Chillax，正文用 Geist |
| 数据 | localStorage + 静态 .md 文件 | 未来可无缝切换到 FastAPI + PostgreSQL |
| 部署 | Vite 静态构建 | 未来接入后端 API |

## 架构设计

项目刻意做了数据与视图的分层，方便未来从「纯前端 mock」迁移到「真实后端」：

```
src/
├── data/           # 静态数据源
│   ├── posts/      # Markdown 文章
│   └── profile.ts  # 个人信息（标签、GitHub 等）
├── services/       # 数据服务层（可替换为 API 调用）
│   ├── themeService.ts
│   └── articlesService.ts
├── auth/           # 认证服务（当前 mock，未来接 JWT）
│   ├── types.ts
│   ├── storage.ts
│   └── auth.ts
├── hooks/          # React 适配层
│   ├── useTheme.tsx
│   ├── useAuth.tsx
│   └── usePosts.ts
├── components/     # UI 组件
├── sections/       # 页面区块
└── pages/          # 路由页面
```

`services/` 和 `auth/` 层的接口形状已经按未来后端契约设计。切换到 FastAPI 时，只需要把 `articlesService.ts` 内部的 `localStorage` 调用换成 `fetch("/api/...")`，React 层零改动。

## 关于内容

这个博客会记录：

- **AI 开发实践**——大模型应用、Agent 设计、Prompt Engineering
- **全栈工程**——前端、后端、部署、DevOps 的踩坑笔记
- **CTF 安全**——竞赛 writeup、安全工具、漏洞分析
- **学习思考**——算法、系统设计、读书笔记
- **生活**——摄影、钢琴、健身，以及其他感兴趣的事

## 写在最后

互联网最大的价值之一，是让知识与信息能够自由流动。这个博客是我的一小片自留地，如果其中的某篇文章恰好帮到了你，那就是它存在的意义。

欢迎在 [GitHub](https://github.com/Mavicer) 上找到我。
