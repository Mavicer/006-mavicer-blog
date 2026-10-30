import { useEffect, useRef } from "react";
import { Check, Moon, Palette, RotateCcw, Sun, X } from "lucide-react";
import { useAppearance } from "@/hooks/useAppearance";
import { useTheme } from "@/hooks/useTheme";
import { backgrounds } from "@/services/appearanceService";
import "@/styles/personalization.css";

export function Personalization({ open, onClose }: { open: boolean; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const { settings, update, reset, wallpaper, error } = useAppearance();
  const { effectiveMode, setMode } = useTheme();
  useEffect(() => {
    if (!open) return;
    const element = dialog.current!;
    element.showModal();
    element.querySelector(".personalization-body")?.scrollTo({ top: 0 });
    const overflow = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";
    return () => {
      element.close(); document.documentElement.style.overflow = overflow;
      document.querySelector<HTMLElement>('[aria-label="侧边工具"]')?.focus({ preventScroll: true });
    };
  }, [open]);
  return <dialog ref={dialog} className="personalization" aria-labelledby="personalization-title" onCancel={onClose} onClose={onClose} onClick={event => {
    if (event.target === event.currentTarget) {
      const rect = event.currentTarget.getBoundingClientRect();
      if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) onClose();
    }
  }}>
    <header className="personalization-header">
      <div><span className="personalization-eyebrow"><Palette size={14} /> 外观设置</span><h2 id="personalization-title">个性化</h2></div>
      <button type="button" className="personalization-close" onClick={onClose} aria-label="关闭个性化" autoFocus><X size={20} /></button>
    </header>
    <div className="personalization-body">
      <div className="personalization-preview" style={{ backgroundImage: `url("${wallpaper}")` }} aria-label={`当前${effectiveMode === "dark" ? "夜景" : "日景"}背景预览`}>
        <span className="personalization-preview-mode">{effectiveMode === "dark" ? <Moon size={12} /> : <Sun size={12} />}{effectiveMode === "dark" ? "夜景" : "日景"}</span>
        <div>此刻，恰好。<small>你的博客，你的风景</small></div>
      </div>
      <section className="personalization-section">
        <div className="personalization-heading"><h3>背景风景</h3><span>日夜成对，随主题切换</span></div>
        <div className="personalization-presets">
          {backgrounds.map(item => <button type="button" key={item.id} className={`personalization-preset ${settings.background === item.id ? "selected" : ""}`} aria-pressed={settings.background === item.id} onClick={() => update({ background: item.id })}>
            <span className="personalization-pair"><img src={item.day} alt="" loading="lazy" /><img src={item.night} alt="" loading="lazy" /><span className="personalization-pair-label">日 / 夜</span>{settings.background === item.id && <span className="personalization-check"><Check size={12} /></span>}</span>
            <span>{item.name}</span><small>{item.id === "default" ? "原有 · 1080p" : "日夜 · 4K"}</small>
          </button>)}
        </div>
      </section>
      {error && <div className="personalization-status" role="status" aria-live="polite">{error}</div>}
    </div>
    <footer className="personalization-footer">
      <button type="button" className="personalization-reset" onClick={() => { reset(); setMode("auto"); }}><RotateCcw size={14} /> 恢复默认</button>
      <button type="button" className="personalization-done" onClick={onClose}>完成</button>
    </footer>
  </dialog>;
}
