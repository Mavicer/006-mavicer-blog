import { PageShell } from "@/components/PageShell";

export default function Gallery() {
  return (
    <PageShell>
      <div className="article-content-container">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2 text-first-text">展示</h1>
          <p className="text-third-text">摄影 · 视频 · 视觉创作</p>
        </div>
        <p className="text-third-text text-center py-20">展示内容即将上线</p>
      </div>
    </PageShell>
  );
}
