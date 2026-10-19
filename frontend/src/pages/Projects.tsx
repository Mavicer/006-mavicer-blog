import { useEffect, useRef, useState } from "react";
import { ArrowRight, ArrowUpRight, Github, Play, Star, X } from "lucide-react";
import { PageShell } from "@/components/PageShell";
import { projects, repoUrl, type Project } from "@/data/projects";
import { useProjectRepos } from "@/hooks/useProjectRepos";
import "@/styles/projects.css";

function ProjectMedia({ project, playing = false }: { project: Project; playing?: boolean }) {
  if (!project.image) {
    return (
      <div className="nexus-cover" role="img" aria-label={project.imageAlt}>
        <span className="nexus-wordmark">Nexus<span>把机会，连接成未来。</span></span>
        <div className="nexus-path">
          {["发现机会", "理解价值", "制定计划", "记录成长"].map((step, i) => (
            <span key={step}><small>0{i + 1}</small>{step}</span>
          ))}
        </div>
        <span className="nexus-caption">产品结构示意</span>
      </div>
    );
  }
  return <img src={playing && project.demo ? project.demo : project.image} alt={project.imageAlt}
    width={project.demo ? 960 : 1280} height={project.demo ? 500 : 800}
    loading="lazy" decoding="async" className={project.demo ? "project-shot project-shot-contain" : "project-shot"} />;
}

export default function Projects() {
  const { repos, loading, error, retry } = useProjectRepos();
  const [selected, setSelected] = useState<Project | null>(null);
  const [playing, setPlaying] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const extraRepos = repos.filter(repo => !projects.some(project => project.repo === repo.name));

  useEffect(() => {
    if (!selected) return;
    const modal = dialog.current;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    modal?.showModal();
    return () => {
      modal?.close();
      document.body.style.overflow = previousOverflow;
    };
  }, [selected]);

  const open = (project: Project) => { setPlaying(false); setSelected(project); };
  const close = () => { dialog.current?.close(); setPlaying(false); setSelected(null); };

  return (
    <div className="projects-page">
      <PageShell showSidebar={false}>
        <header className="projects-header">
          <p className="projects-eyebrow">LEARNING BY BUILDING</p>
          <h1>Projects<span>把想法，做成作品。</span></h1>
          <p className="projects-intro">从第一个网站，到本地视觉实验。这里记录可以看见的成果，也留下持续探索的过程。</p>
          <a href="https://github.com/Mavicer" target="_blank" rel="noopener noreferrer" className="projects-github"><Github size={16} aria-hidden="true" /> GitHub / Mavicer <ArrowUpRight size={15} aria-hidden="true" /></a>
        </header>

        <div className="projects-grid">
          {projects.map((project, index) => {
            const repo = repos.find(repo => repo.name === project.repo);
            return (
              <article className="project-work" key={project.repo}>
                <button className="project-media" onClick={() => open(project)} aria-label={`查看 ${project.name} 项目`}>
                  <ProjectMedia project={project} />
                  <span className="project-preview-label">{project.demo ? <Play size={14} aria-hidden="true" /> : <ArrowUpRight size={15} aria-hidden="true" />}{project.demo ? "观看演示" : "查看项目"}</span>
                  {index === 0 && <span className="project-featured">精选实验</span>}
                </button>
                <div className="project-copy">
                  <p className="project-kicker">{project.number} / {project.category}</p>
                  <h2>{project.name}</h2>
                  <p className="project-summary">{project.summary}</p>
                  <ul className="project-tags" aria-label={`${project.name} 技术栈`}>{project.tags.map(tag => <li key={tag}>{tag}</li>)}</ul>
                  <div className="project-actions">
                    <button onClick={() => open(project)} className="project-detail-link">了解项目 <ArrowRight size={15} aria-hidden="true" /></button>
                    <div>{project.website && <a href={project.website} target="_blank" rel="noopener noreferrer" aria-label={`访问 ${project.name} 网站`}>体验 <ArrowUpRight size={14} aria-hidden="true" /></a>}<a href={repoUrl(project.repo)} target="_blank" rel="noopener noreferrer" aria-label={`${project.name} 源码`}><Github size={15} aria-hidden="true" /> 源码</a></div>
                  </div>
                  <div className="project-caption"><span>{project.caption}</span>{repo && <span className="project-live-stat"><Star size={12} aria-hidden="true" />{repo.stars}<span className="sr-only"> Stars</span></span>}</div>
                </div>
              </article>
            );
          })}
        </div>
        <div className="projects-sync" role="status">
          {error ? <><span>{error}</span><button type="button" onClick={retry} disabled={loading}>重新获取统计</button></> : loading ? "正在更新 GitHub 统计…" : "项目统计由 GitHub 定期更新。"}
        </div>
        {extraRepos.length > 0 && <section className="projects-more"><h2>更多公开仓库</h2>{extraRepos.map(repo => <a key={repo.name} href={repo.html_url} target="_blank" rel="noopener noreferrer">{repo.name} <ArrowUpRight size={15} aria-hidden="true" /></a>)}</section>}
      </PageShell>
      <dialog ref={dialog} className="project-dialog" aria-labelledby="project-dialog-title"
        onClose={() => { setSelected(null); setPlaying(false); }}
        onClick={event => { if (event.target === event.currentTarget) { const rect = event.currentTarget.getBoundingClientRect(); if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) close(); } }}>
        {selected && <>
          <div className="project-dialog-header"><span>{selected.number} / {selected.category}</span><button type="button" onClick={close} autoFocus aria-label="关闭项目详情"><X size={20} aria-hidden="true" /></button></div>
          <div className="project-dialog-media"><ProjectMedia project={selected} playing={playing} /></div>
          <div className="project-dialog-copy">
            <div className="project-dialog-heading"><h2 id="project-dialog-title">{selected.name}</h2>{selected.demo && <button className="project-play" onClick={() => setPlaying(value => !value)} aria-pressed={playing}><Play size={15} aria-hidden="true" />{playing ? "停止演示" : "播放拖尾演示"}</button>}</div>
            <p className="project-story">{selected.story}</p>
            <h3>项目里的探索</h3><ul className="project-highlights">{selected.highlights.map(item => <li key={item}>{item}</li>)}</ul>
            <p className="project-note">{selected.note}</p>
            <div className="project-dialog-actions">{selected.website && <a href={selected.website} target="_blank" rel="noopener noreferrer">访问网站 <ArrowUpRight size={16} aria-hidden="true" /></a>}<a href={repoUrl(selected.repo)} target="_blank" rel="noopener noreferrer"><Github size={16} aria-hidden="true" /> 查看源码</a></div>
          </div>
        </>}
      </dialog>
    </div>
  );
}
