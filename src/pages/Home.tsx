import { motion } from "framer-motion";
import { HomeBanner } from "@/sections/HomeBanner";
import { Sidebar } from "@/sections/Sidebar";
import { MobileProfileCard } from "@/components/MobileProfileCard";
import { ArticleCard } from "@/components/ArticleCard";
import { usePosts } from "@/hooks/usePosts";

export default function Home() {
  const { posts, loading } = usePosts();

  return (
    <>
      <HomeBanner />
      <div className="main-content-container flex flex-col justify-between min-h-dvh">
        <div className="main-content-header" />
        <motion.div
          className="main-content-body flex flex-row flex-wrap justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
        >
          <Sidebar />
          <MobileProfileCard />

          <div className="main-content">
            <div className="home-content-container">
              {loading ? (
                <p className="text-center py-10 text-third-text">正在读取文章列表</p>
              ) : posts.length === 0 ? (
                <p className="text-center py-10 text-third-text">暂无文章</p>
              ) : (
                <ul className="home-article-list list-none p-0 m-0">
                  {posts.map((post) => (
                    <ArticleCard key={post.slug} post={post} />
                  ))}
                </ul>
              )}

              <div className="home-paginator px-7 py-5">
                <div className="paginator">
                  <span className="page-number current">1</span>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </>
  );
}
