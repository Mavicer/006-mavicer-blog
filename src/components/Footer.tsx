import { Link } from "react-router-dom";
import { site } from "@/config/site";
import { useRuntime } from "@/hooks/useScroll";
import { usePosts } from "@/hooks/usePosts";
import { Odometer } from "@/components/Odometer";

export function Footer() {
  const runtime = useRuntime(site.footerStart);
  const { posts } = usePosts();
  const articleCount = posts.filter((p) => p.published !== false).length;
  return (
    <footer className="footer mt-5 py-5 h-auto text-base text-third-text relative border-t-2 border-border-color">
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

        <div className="footer-side footer-powered text-center lg:absolute lg:left-[20px] lg:top-1/2 lg:-translate-y-1/2 lg:text-left">
          <span className="lg:block text-sm">
            由{" "}
            <svg
              className="relative top-[2px] inline-block align-baseline"
              width="1rem"
              height="1rem"
              viewBox="0 0 512 512"
            >
              <path
                fill="#0E83CD"
                d="M256.4,25.8l-200,115.5L56,371.5l199.6,114.7l200-115.5l0.4-230.2L256.4,25.8z M349,354.6l-18.4,10.7l-18.6-11V275H200v79.6l-18.4,10.7l-18.6-11v-197l18.5-10.6l18.5,10.8V237h112v-79.6l18.5-10.6l18.5,10.8V354.6z"
              />
            </svg>{" "}
            React 驱动
          </span>
          <span className="lg:block text-sm">
            主题&nbsp;
            <a
              className="text-base"
              target="_blank"
              rel="noopener noreferrer"
              href="https://github.com/EvanNotFound/hexo-theme-redefine"
            >
              Redefine
            </a>
          </span>
        </div>
      </div>
    </footer>
  );
}
