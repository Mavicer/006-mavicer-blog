import { Link } from "react-router-dom";
import type { Post } from "@/hooks/usePosts";
import { ICONS } from "@/components/icons";

const CalendarIcon = ICONS.calendar;
const FolderIcon = ICONS.folder;

function formatDate(iso: string): string {
  return iso.slice(0, 10);
}

/** Max number of tag pills shown on a card (no expand/collapse). */
const TAG_LIMIT = 4;

export function ArticleCard({ post }: { post: Post }) {
  const tags = post.tags.slice(0, TAG_LIMIT);

  return (
    <li className="home-article-item">
      <div className="flex flex-col gap-5 px-7 pb-7 pt-7 no-underline text-inherit">
        {/* Title — click trigger #1 */}
        <h3 className="home-article-title">
          <Link to={`/posts/${post.slug}`} className="no-underline text-inherit">
            {post.title}
          </Link>
        </h3>

        {/* Excerpt — non-clickable */}
        <p className="home-article-content markdown-body">{post.excerpt}</p>

        {/* Second-to-last row: date(+icon) + category(+icon) LEFT, 阅读全文 RIGHT */}
        <div className="home-article-meta-info-container">
          <div className="home-article-meta-info">
            <span className="meta-item whitespace-nowrap">
              <CalendarIcon />
              <span className="home-article-date">{formatDate(post.date)}</span>
            </span>
            <span className="home-article-category whitespace-nowrap">
              <FolderIcon />
              <span
                className={
                  post.category === "经验分享" ? "font-semibold text-primary" : ""
                }
              >
                {post.category}
              </span>
            </span>
          </div>
          {/* 阅读全文 — click trigger #2 (rightmost).
              Text + arrow must sit on ONE line; the sr-only title is
              visually hidden (absolute, 1px) so it never affects layout. */}
          <Link
            to={`/posts/${post.slug}`}
            className="home-article-readmore inline-flex items-center gap-1 flex-nowrap whitespace-nowrap no-underline text-third-text hover:text-primary transition-colors"
          >
            <span className="whitespace-nowrap">阅读全文</span>
            <span className="seo-reader-text">{post.title}</span>
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ flexShrink: 0 }}
            >
              <path d="M5 12h14" />
              <path d="M13 6l6 6-6 6" />
            </svg>
          </Link>
        </div>

        {/* Last row: pill tags (max 4), no collapse */}
        {tags.length > 0 && (
          <div className="home-article-tags flex flex-wrap gap-2">
            {tags.map((t) => (
              <Link
                key={t}
                to={`/tags/${encodeURIComponent(t)}`}
                className="tag-pill px-2.5 py-1 rounded-full text-xs bg-third-background text-third-text border border-border no-underline hover:text-primary hover:border-primary transition-colors"
              >
                #{t}
              </Link>
            ))}
          </div>
        )}
      </div>
    </li>
  );
}
