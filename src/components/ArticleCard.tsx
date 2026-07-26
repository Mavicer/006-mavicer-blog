import { Link } from "react-router-dom";
import type { Post } from "@/hooks/usePosts";

function formatDate(iso: string): string {
  return iso.slice(0, 10);
}

export function ArticleCard({ post }: { post: Post }) {
  return (
    <li className="home-article-item">
      <div className="flex flex-col gap-5 px-7 pb-7 pt-7">
        <h3 className="home-article-title">
          <Link to={`/posts/${post.slug}`}>{post.title}</Link>
        </h3>

        <div className="home-article-content markdown-body">{post.excerpt}</div>

        <div className="home-article-meta-info-container">
          <div className="home-article-meta-info">
            <span>
              <i className="fa-solid fa-calendar-days" />
              &nbsp;
              <span className="home-article-date">{formatDate(post.date)}</span>
            </span>
            <span className="home-article-category">
              <i className="fa-solid fa-folder" />
              &nbsp;
              <ul className="inline">
                <li className="inline">
                  <Link to={`/categories/${encodeURIComponent(post.category)}`}>
                    {post.category}
                  </Link>
                  &nbsp;
                </li>
              </ul>
            </span>
            {post.tags.length > 0 && (
              <span className="home-article-tag">
                <i className="fa-solid fa-tag" />
                &nbsp;
                <ul className="inline">
                  {post.tags.map((tag, i) => (
                    <li key={tag} className="inline">
                      {i > 0 && <span className="mx-1">|</span>}
                      <Link to={`/tags/${encodeURIComponent(tag)}`}>{tag}</Link>
                      &nbsp;
                    </li>
                  ))}
                </ul>
              </span>
            )}
          </div>
          <Link to={`/posts/${post.slug}`}>
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
