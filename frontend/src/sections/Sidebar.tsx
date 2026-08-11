import { Link } from "react-router-dom";
import { SIDEBAR_LINKS } from "@/config/nav";
import { site } from "@/config/site";
import { profile } from "@/data/profile";
import { usePosts } from "@/hooks/usePosts";
import { ICONS } from "@/components/icons";

export function Sidebar() {
  const { posts, categories } = usePosts();
  return (
    <div className="home-sidebar-container hidden md:block">
      <div className="sticky-container sticky">
        <div className="sidebar-links">
          <div className="site-info">
            <div className="site-name">{site.name}</div>
            <div className="announcement">{site.announcement}</div>
          </div>
          {SIDEBAR_LINKS.map((l) => {
            const Icon = ICONS[l.svg];
            return (
              <Link key={l.path} className="links" to={l.path}>
                <Icon />
                <span className="link-name">{l.label}</span>
              </Link>
            );
          })}
        </div>

        <div className="sidebar-content">
          <div className="avatar flex justify-center">
            <img
              src="/images/avatar.jpg"
              alt="avatar"
              loading="lazy"
              className="w-[110px] h-[110px] rounded-full object-cover"
            />
          </div>
          <div className="author flex flex-col justify-center my-2.5 mx-0">
            <div className="name text-center text-lg font-semibold text-first-text">
              {site.author}
            </div>
            <Link
              to="/about"
              className="label text-center text-xs text-third-text mt-1 hover:text-primary transition-colors"
            >
              关于
              <i className="fa-solid fa-chevron-right fa-2xs ml-0.5 align-middle" />
            </Link>
          </div>
          <div className="statistics flex justify-around my-2.5">
            <Link
              className="item tag-count-item flex flex-col justify-center items-center w-20"
              to="/categories"
            >
              <div className="number text-2xl sm:text-xl text-second-text font-semibold">
                {categories.length}
              </div>
              <div className="label text-third-text text-sm">分类</div>
            </Link>
            <Link
              className="item tag-count-item flex flex-col justify-center items-center w-20"
              to="/archives"
            >
              <div className="number text-2xl sm:text-xl text-second-text font-semibold">
                {posts.length}
              </div>
              <div className="label text-third-text text-sm">文章</div>
            </Link>
          </div>

          {/* Personal intro tags — fixed self-description, decoupled from
              the article taxonomy (article.tags vs profile.tags). */}
          <div className="profile-tags flex flex-wrap gap-2 justify-center mt-4 px-2">
            {profile.tags.map((t) => (
              <span
                key={t}
                className="profile-tag px-2.5 py-1 rounded-full text-xs bg-third-background text-third-text border border-border"
              >
                #{t}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
