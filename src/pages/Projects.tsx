import { PageShell } from "@/components/PageShell";

const PROJECTS = [
  {
    title: "Personal Blog",
    desc: "React + FastAPI 全栈个人博客，复刻 Redefine 主题视觉。支持 Markdown、评论、点赞、收藏、在线人数统计与管理后台。",
    tags: ["React", "TypeScript", "FastAPI", "Tailwind"],
    link: "#",
  },
  {
    title: "AI Tools",
    desc: "对「AI + Web 工具」方向的长期探索。关注清晰的输入、稳定的处理流程、可解释的输出与顺滑的交互。",
    tags: ["AI", "Full-stack"],
    link: "#",
  },
  {
    title: "CTF & Security",
    desc: "CTF 训练养成的攻击者视角：输入是否可信、边界是否清晰、状态是否可控、异常是否被处理。",
    tags: ["CTF", "Security"],
    link: "#",
  },
];

export default function Projects() {
  return (
    <PageShell>
      <div className="article-content-container">
        <h1 className="text-4xl font-bold mb-2 text-first-text">Projects</h1>
        <p className="text-third-text mb-8">Selected Works — 这里整理我希望长期展示的项目。</p>

        <div className="flex flex-col gap-6">
          {PROJECTS.map((p) => (
            <article
              key={p.title}
              className="p-6 rounded-redefine shadow-redefine-flat hover:shadow-redefine-flat-hover transition-shadow border border-border"
            >
              <h2 className="text-2xl font-semibold mb-2 text-first-text">
                {p.title}
              </h2>
              <p className="markdown-body mb-4">{p.desc}</p>
              <div className="flex gap-2 flex-wrap">
                {p.tags.map((t) => (
                  <span
                    key={t}
                    className="px-3 py-1 rounded-full text-xs bg-third-background text-third-text border border-border"
                  >
                    {t}
                  </span>
                ))}
              </div>
            </article>
          ))}
        </div>
      </div>
    </PageShell>
  );
}
