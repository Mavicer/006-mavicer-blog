import { useState } from "react";
import { Link } from "react-router-dom";
import type { Post } from "@/hooks/usePosts";

function formatDate(iso: string): string {
  return iso.slice(0, 10);
}

/** Mobile: how many tags to show before collapsing to "+N". */
const MOBILE_TAG_LIMIT = 3;

export function ArticleCard({ post }: { post: Post }) {
  const [tagsExpanded, setTagsExpanded] = useState(false);

  const visibleTags = tagsExpanded
    ? post.tags
    : post.tags.slice(0, MOBILE_TAG_LIMIT);
  const hiddenCount = post.tags.length - visibleTags.length;

  return (
    <li className="home-article-item">
      <div className="flex flex-col gap-5 px-7 pb-7 pt-7">
        <h3 className="home-article-title">
          <Link to={`/posts/${post.slug}`}>{post.title}</Link>
        </h3>

        <div className="home-article-content markdown-body">{post.excerpt}</div>

        <div className="home-article-meta-info-container">
          <div className="home-article-meta-info">
            <span className="meta-item whitespace-nowrap">
              <i className="fa-solid fa-calendar-days" />
              &nbsp;
              <span className="home-article-date">{formatDate(post.date)}</span>
            </span>
            <span className="home-article-category whitespace-nowrap">
              <i className="fa-solid fa-folder" />
              &nbsp;
              <Link
                to={`/categories/${encodeURIComponent(post.category)}`}
                className={post.category === "经验分享" ? "font-semibold text-primary" : ""}
              >
                {post.category}
              </Link>
            </span>
            {post.tags.length > 0 && (
              <span className="home-article-tag whitespace-nowrap">
                <i className="fa-solid fa-tag" />
                &nbsp;
                <span className="tag-list">
                  {visibleTags.map((tag, i) => (
                    <span key={tag} className="tag-item">
                      {i > 0 && <span className="tag-sep">|</span>}
                      <Link to={`/tags/${encodeURIComponent(tag)}`}>{tag}</Link>
                    </span>
                  ))}
                  {hiddenCount > 0 && (
                    <button
                      className="tag-more cursor-pointer text-third-text hover:text-primary transition-colors"
                      onClick={() => setTagsExpanded(true)}
                    >
                      <span className="tag-sep">|</span>+{hiddenCount}
                    </button>
                  )}
                  {tagsExpanded && post.tags.length > MOBILE_TAG_LIMIT && (
                    <button
                      className="tag-more cursor-pointer text-third-text hover:text-primary transition-colors"
                      onClick={() => setTagsExpanded(false)}
                    >
                      <span className="tag-sep">|</span>收起
                    </button>
                  )}
                </span>
              </span>
            )}
          </div>
          <Link to={`/posts/${post.slug}`} className="whitespace-nowrap">
            阅读全文
            <span className="seo-reader-text sr-only">{post.title}</span>
            &nbsp;
            <i className="fa-solid fa-angle-right" />
          </Link>
        </div>
      </div>
    </li>
  );
}
