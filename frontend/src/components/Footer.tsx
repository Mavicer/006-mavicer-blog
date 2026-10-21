import { Link } from "react-router-dom";
import { site } from "@/config/site";
import { useRuntime } from "@/hooks/useScroll";
import { usePosts } from "@/hooks/usePosts";
import { Odometer } from "@/components/Odometer";
import { useVisitorStats } from "@/hooks/useVisitorStats";

export function Footer() {
  const runtime = useRuntime(site.footerStart);
  const { posts } = usePosts();
  const visits = useVisitorStats();
  const articleCount = posts.filter((p) => p.published !== false).length;

  return (
    <footer className="footer mt-5 py-5 h-auto text-base text-second-text relative border-t-2 border-border-color">
      <div className="info-container py-3 text-center">
        <div className="customize-info my-1">个人网站正在持续更新</div>

        <div className="text-center">
          © 2026 - {site.copyrightYear}&nbsp;&nbsp;
          <span className="footer-heart" aria-label="love">&hearts;</span>
          &nbsp;&nbsp;
          <Link to="/">{site.author}</Link>
          <p className="post-count space-x-0.5">
            <span>共撰写了 {articleCount} 篇文章</span>
          </p>
        </div>

        <div className="footer-runtime">
          博客已运行{" "}
          <Odometer value={runtime.d} />{" "}
          天{" "}
          <Odometer value={String(runtime.h).padStart(2, "0")} />{" "}
          小时{" "}
          <Odometer value={String(runtime.m).padStart(2, "0")} />{" "}
          分钟{" "}
          <Odometer value={String(runtime.s).padStart(2, "0")} />{" "}
          秒
        </div>

        <div className="footer-side footer-visits text-center" title={visits.unavailable ? "统计暂时无法更新" : undefined}>
          <span className="text-sm">累计访问 {visits.stats ? visits.stats.pv.toLocaleString("zh-CN") : "—"} 次</span>
          <span className="text-sm">当前在线 {visits.stats && !visits.unavailable ? visits.stats.online.toLocaleString("zh-CN") : "—"} 人</span>
          {visits.unavailable && <button type="button" className="ml-2 underline underline-offset-2" onClick={visits.retry}>重试</button>}
        </div>
      </div>
    </footer>
  );
}
