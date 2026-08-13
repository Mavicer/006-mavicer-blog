import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { site } from "@/config/site";
import { profile } from "@/data/profile";
import { usePosts } from "@/hooks/usePosts";
import { Odometer } from "@/components/Odometer";
import { getVisits } from "@/lib/api";

/**
 * MobileProfileCard — compact personal info card shown only on mobile,
 * above the article list. Desktop uses the full Sidebar instead.
 *
 * Layout: avatar + name/stats on top row, tags below (flex-wrap).
 */
export function MobileProfileCard() {
  const { posts, categories } = usePosts();
  const [visits, setVisits] = useState<{ pv: number; uv: number }>({
    pv: 0,
    uv: 0,
  });

  useEffect(() => {
    let alive = true;
    getVisits()
      .then((v) => alive && setVisits(v))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);


  return (
    <div className="mobile-profile-card mb-6">
      <div className="flex items-center gap-4">
        <img
          src="/images/avatar.jpg"
          alt="avatar"
          loading="lazy"
          className="w-14 h-14 rounded-full object-cover shrink-0"
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2">
            <span className="text-base font-semibold text-first-text truncate">
              {site.author}
            </span>
            <Link to="/about" className="inline-flex items-center gap-1 text-xs text-third-text hover:text-primary transition-colors">
              关于
              <i className="fa-solid fa-chevron-right fa-xs" />
            </Link>
          </div>
          <div className="flex gap-4 mt-0.5">
            <Link to="/categories" className="flex flex-col">
              <span className="text-lg font-semibold text-second-text leading-tight">
                {categories.length}
              </span>
              <span className="text-[0.65rem] text-third-text">分类</span>
            </Link>
            <Link to="/archives" className="flex flex-col">
              <span className="text-lg font-semibold text-second-text leading-tight">
                {posts.length}
              </span>
              <span className="text-[0.65rem] text-third-text">文章</span>
            </Link>
            <div className="flex flex-col" title={`${visits.pv} 次访问`}>
              <span className="text-lg font-semibold text-second-text leading-tight">
                <Odometer value={visits.uv} />
              </span>
              <span className="text-[0.65rem] text-third-text">访客</span>
            </div>
          </div>
        </div>
      </div>

      <div className="mobile-profile-tags flex flex-wrap gap-1.5 mt-3">
        {profile.tags.map((t) => (
          <span
            key={t}
            className="px-2 py-0.5 rounded-full text-[0.65rem] bg-third-background text-third-text border border-border whitespace-nowrap"
          >
            #{t}
          </span>
        ))}
      </div>
    </div>
  );
}
