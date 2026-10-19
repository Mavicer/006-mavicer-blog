/** Editorial project content stays available even when GitHub is unreachable.
 * Live counters belong to /api/projects; these descriptions never claim live status.
 */
export type Project = {
  repo: string;
  name: string;
  number: string;
  category: string;
  summary: string;
  image?: string;
  imageAlt: string;
  caption: string;
  demo?: string;
  website?: string;
  tags: string[];
  story: string;
  highlights: string[];
  note: string;
};

export const projects: Project[] = [
  {
    repo: "007-visuallab", name: "VisualLab", number: "007", category: "COMPUTER VISION",
    summary: "从识别与检测，到画面里的目标追踪与粒子拖尾。",
    image: "/images/projects/visuallab-poster.jpg", imageAlt: "VisualLab 合成观测点演示：结果画面、灰度与二值诊断视图",
    caption: "拖尾效果演示 · 合成观测点", demo: "/images/projects/visuallab-demo.gif",
    tags: ["Python", "OpenCV", "YOLO"],
    story: "从摄像头与 OpenCV 入门，把文字识别、模拟装甲板检测、短时追踪和可视化反馈逐步串进一个本地工作区。",
    highlights: ["彩色结果、灰度与二值诊断画面并排呈现", "短时目标关联与受约束的光流补偿", "渐隐轨迹、柔光与时间粒子的显示效果"],
    note: "本页动画是公开仓库中的合成观测点显示演示，不代表模型准确率或实拍跟踪成绩。项目仍处于学习与实验阶段。",
  },
  {
    repo: "006-mavicer-blog", name: "Mavicer's Blog", number: "006", category: "PERSONAL BLOG",
    summary: "用一个持续生长的网站，沉淀技术实践与个人思考。",
    image: "/images/projects/blog-article.jpg", imageAlt: "Mavicer 博客真实文章页：淡化山景与乳白毛玻璃正文卡片",
    caption: "文章阅读页 · 真实页面截图", website: "https://mavicer.cc",
    tags: ["React", "TypeScript", "Cloudflare"],
    story: "把写作、发布和作品展示放进同一个长期维护的个人空间，让每一次学习都能留下可以回看的记录。",
    highlights: ["Markdown 文章与在线编辑发布", "账号、评论与收藏形成阅读互动", "浅深主题与专注阅读的毛玻璃文章页"],
    note: "封面为公开文章页截图；网站内容与界面会随持续更新而变化。",
  },
  {
    repo: "005-nexus", name: "Nexus", number: "005", category: "STUDENT PLATFORM",
    summary: "发现机会、理解价值，把大学阶段的选择连接起来。",
    imageAlt: "Nexus 产品结构示意：发现机会、理解价值、制定计划、记录成长",
    caption: "大学生成长平台 · 产品结构示意",
    tags: ["Next.js", "TypeScript", "PostgreSQL"],
    story: "围绕大学生活中的信息差，探索可靠的信息检索与个人成长平台，逐步连接竞赛、科研和发展机会。",
    highlights: ["以竞赛信息检索作为 MVP 切入点", "关注来源可信度与搜索效率", "向计划管理和成长记录延伸的产品方向"],
    note: "当前未提供公开在线体验。封面为产品方向示意，不是已上线功能截图；具体实现进度以仓库为准。",
  },
  {
    repo: "003-travel-website", name: "Wanderful", number: "003", category: "TRAVEL & WEB",
    summary: "从第一个 Web 项目出发，探索旅行网站的视觉与交互。",
    image: "/images/projects/wanderful-home.jpg", imageAlt: "旅行网站真实首页截图：雪山云海与行无止境的主视觉",
    caption: "旅行网站首页 · 真实页面截图", website: "https://003-travel-website.pages.dev",
    tags: ["React", "TypeScript", "GSAP"],
    story: "从一个完整的旅游网站开始学习前端开发，在大幅影像、文字层级和响应式布局之间寻找舒服的浏览节奏。",
    highlights: ["以山景影像建立首屏氛围", "目的地与旅行内容的页面组织", "从桌面到手机的响应式交互实践"],
    note: "封面来自公开演示网站。页面中的行程与旅行内容属于项目演示，具体能力以实际体验为准。",
  },
];

export const repoUrl = (name: string) => `https://github.com/Mavicer/${encodeURIComponent(name)}`;
