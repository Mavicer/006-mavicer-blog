import { Link } from "react-router-dom";
import { PageShell } from "@/components/PageShell";
import { usePosts } from "@/hooks/usePosts";
export default function Admin() {
  const { posts } = usePosts();
  return <PageShell showSidebar={false}><div className="article-content-container max-w-[760px] mx-auto">
    <div className="flex flex-wrap gap-4 items-center justify-between mb-6"><h1 className="text-3xl font-bold">文章管理</h1><Link to="/admin/articles/new" className="px-4 py-2 rounded-md bg-primary text-white">发布文章</Link></div>
    <Link to="/admin/feedback" className="inline-block text-primary mb-6">查看匿名留言 →</Link>
    <p className="text-third-text mb-6">编辑会从 GitHub 读取最新原文；发布后自动部署，原有文章地址和互动数据会保留。</p>
    <ul className="flex flex-col gap-4">{posts.map((post) => <li key={post.slug} className="border border-border rounded-md p-4"><Link className="font-bold" to={`/posts/${post.slug}`}>{post.title}</Link><div className="flex gap-4 mt-2 text-sm"><span className="text-third-text">{post.date.slice(0, 10)}</span><Link className="text-primary" to={`/admin/articles/${post.slug}/edit`}>编辑文章</Link></div></li>)}</ul>
  </div></PageShell>;
}
