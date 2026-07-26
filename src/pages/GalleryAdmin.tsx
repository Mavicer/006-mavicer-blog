import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { PageShell } from "@/components/PageShell";
import { useAuth } from "@/hooks/useAuth";
import {
  listGallery,
  createGalleryItem,
  updateGalleryItem,
  deleteGalleryItem,
  fileToDataURL,
  extractVideoCover,
  type GalleryItem,
  type GalleryType,
} from "@/services/galleryService";

type UploadEntry = {
  file: File;
  type: GalleryType;
  title: string;
  description: string;
  sortOrder: number;
};

export default function GalleryAdmin() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [status, setStatus] = useState("");
  const [uploading, setUploading] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  const load = () => {
    setItems(listGallery());
    setStatus("就绪");
  };

  useEffect(() => {
    if (!user) {
      navigate("/login?next=/gallery/admin");
      return;
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // ── Drag & drop + file picker ──────────────────────────────────
  const [dragOver, setDragOver] = useState(false);

  const handleFiles = async (files: FileList | File[]) => {
    const arr = Array.from(files);
    if (arr.length === 0) return;
    setUploading(true);
    setStatus(`正在导入 ${arr.length} 个文件...`);

    for (const file of arr) {
      const isVideo = file.type.startsWith("video/");
      const isImage = file.type.startsWith("image/");
      if (!isVideo && !isImage) continue;

      const type: GalleryType = isVideo ? "video" : "photo";
      const title = file.name.replace(/\.[^.]+$/, "");

      try {
        if (type === "photo") {
          const dataUrl = await fileToDataURL(file);
          createGalleryItem({
            type,
            title,
            url: dataUrl,
            sortOrder: 10,
            source: "upload",
          });
        } else {
          // For video: store the file as a blob URL won't survive reload.
          // Store as data URL (works for small clips; large videos should
          // use a URL instead). Extract a cover frame automatically.
          const dataUrl = await fileToDataURL(file);
          let cover: string | undefined;
          try {
            cover = await extractVideoCover(file);
          } catch {
            /* cover extraction can fail; not critical */
          }
          createGalleryItem({
            type,
            title,
            url: dataUrl,
            cover,
            sortOrder: 10,
            source: "upload",
          });
        }
      } catch (err: any) {
        setStatus(`导入失败：${file.name} — ${err?.message || ""}`);
      }
    }

    setUploading(false);
    load();
    setStatus(`已导入 ${arr.length} 个文件`);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  };

  // ── URL-based add (existing form, simplified) ─────────────────
  const [showUrlForm, setShowUrlForm] = useState(false);
  const [urlForm, setUrlForm] = useState({
    type: "photo" as GalleryType,
    title: "",
    url: "",
    cover: "",
    description: "",
  });

  const onUrlSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createGalleryItem({
      type: urlForm.type,
      title: urlForm.title,
      url: urlForm.url,
      cover: urlForm.cover || undefined,
      description: urlForm.description || undefined,
      source: "url",
    });
    setUrlForm({ type: "photo", title: "", url: "", cover: "", description: "" });
    setShowUrlForm(false);
    load();
    setStatus("已添加");
  };

  const remove = (id: string) => {
    if (!window.confirm("删除这个展示项？")) return;
    deleteGalleryItem(id);
    load();
  };

  if (!user) {
    return (
      <PageShell showSidebar={false}>
        <div className="article-content-container max-w-[480px] mx-auto text-center">
          <p className="mb-4">请先登录</p>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell showSidebar={false}>
      <div className="article-content-container max-w-[980px] mx-auto">
        <h1 className="text-3xl font-bold mb-4 text-first-text">展示管理</h1>
        <p className="text-third-text mb-6 text-sm">{status}</p>

        {/* ── Upload zone ─────────────────────────────────────────── */}
        <div
          className={`upload-zone border-2 border-dashed rounded-redefine p-10 text-center transition-colors cursor-pointer mb-6 ${
            dragOver
              ? "border-primary bg-primary/5"
              : "border-border hover:border-primary/50"
          }`}
          onClick={() => photoInputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
        >
          <i className="fa-solid fa-cloud-arrow-up text-4xl text-third-text mb-3 block" />
          <p className="text-first-text font-semibold mb-1">
            点击导入或拖拽文件到此处
          </p>
          <p className="text-third-text text-sm">
            支持照片 (JPG/PNG/WebP) 和视频 (MP4/MOV/WebM)
          </p>
          {uploading && (
            <p className="text-primary text-sm mt-3">
              <i className="fa-solid fa-spinner fa-spin mr-1" />
              正在导入...
            </p>
          )}

          {/* Hidden file inputs — `capture` not set so desktop opens Finder,
              mobile opens photo library chooser */}
          <input
            ref={photoInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => {
              if (e.target.files) handleFiles(e.target.files);
              e.target.value = "";
            }}
          />
          <input
            ref={videoInputRef}
            type="file"
            accept="video/*"
            multiple
            className="hidden"
            onChange={(e) => {
              if (e.target.files) handleFiles(e.target.files);
              e.target.value = "";
            }}
          />
        </div>

        {/* Quick buttons: photo / video / URL */}
        <div className="flex gap-3 mb-6">
          <button
            onClick={() => photoInputRef.current?.click()}
            className="px-4 py-2 rounded-md border border-border font-semibold hover:text-primary transition-colors text-sm"
          >
            <i className="fa-solid fa-image mr-1.5" />
            导入照片
          </button>
          <button
            onClick={() => videoInputRef.current?.click()}
            className="px-4 py-2 rounded-md border border-border font-semibold hover:text-primary transition-colors text-sm"
          >
            <i className="fa-solid fa-video mr-1.5" />
            导入视频
          </button>
          <button
            onClick={() => setShowUrlForm((v) => !v)}
            className="px-4 py-2 rounded-md border border-border font-semibold hover:text-primary transition-colors text-sm"
          >
            <i className="fa-solid fa-link mr-1.5" />
            用 URL 添加
          </button>
        </div>

        {/* URL form (collapsible) */}
        {showUrlForm && (
          <form onSubmit={onUrlSubmit} className="flex flex-col gap-3 mb-8 p-4 rounded-redefine border border-border bg-third-background">
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" checked={urlForm.type === "photo"} onChange={() => setUrlForm({ ...urlForm, type: "photo" })} />
                <span className="text-sm">照片</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" checked={urlForm.type === "video"} onChange={() => setUrlForm({ ...urlForm, type: "video" })} />
                <span className="text-sm">视频</span>
              </label>
            </div>
            <input required placeholder="标题" value={urlForm.title} onChange={(e) => setUrlForm({ ...urlForm, title: e.target.value })} className="px-3 py-2 rounded-md border border-border bg-background" />
            <input required placeholder="URL" value={urlForm.url} onChange={(e) => setUrlForm({ ...urlForm, url: e.target.value })} className="px-3 py-2 rounded-md border border-border bg-background" />
            {urlForm.type === "video" && (
              <input placeholder="封面图 URL（可选）" value={urlForm.cover} onChange={(e) => setUrlForm({ ...urlForm, cover: e.target.value })} className="px-3 py-2 rounded-md border border-border bg-background" />
            )}
            <input placeholder="描述（可选）" value={urlForm.description} onChange={(e) => setUrlForm({ ...urlForm, description: e.target.value })} className="px-3 py-2 rounded-md border border-border bg-background" />
            <button type="submit" className="px-4 py-2 rounded-md bg-primary text-white font-semibold self-start">添加</button>
          </form>
        )}

        {/* ── Item list ───────────────────────────────────────────── */}
        <section>
          <h2 className="text-xl font-bold mb-3 text-first-text">展示列表</h2>
          <div className="flex flex-col gap-3">
            {items.length === 0 && (
              <p className="text-third-text text-sm">暂无展示项，先导入一些照片或视频吧。</p>
            )}
            {items.map((item) => (
              <article
                key={item.id}
                className="p-3 rounded-redefine-small border border-border bg-background flex items-center gap-4"
              >
                <img
                  src={item.type === "photo" ? item.url : item.cover || ""}
                  alt=""
                  className="w-16 h-16 object-cover rounded-md shrink-0"
                  onError={(e) => ((e.target as HTMLImageElement).style.opacity = "0")}
                />
                <div className="flex-1 min-w-0">
                  <strong className="text-sm truncate block">{item.title}</strong>
                  <p className="text-xs text-third-text mt-1">
                    {item.type === "photo" ? "📷 照片" : "🎬 视频"}
                    {item.source === "upload" ? " · 已上传" : " · URL"}
                  </p>
                </div>
                <button
                  onClick={() => remove(item.id)}
                  className="px-2 py-1 rounded border border-border text-sm hover:text-primary shrink-0"
                >
                  <i className="fa-solid fa-trash-can" />
                </button>
              </article>
            ))}
          </div>
        </section>
      </div>
    </PageShell>
  );
}
