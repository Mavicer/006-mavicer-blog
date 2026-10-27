import { useEffect, useRef, useState } from "react";
import { Check, ImagePlus, Moon, Palette, RotateCcw, Sun, Upload, X } from "lucide-react";
import { useAppearance } from "@/hooks/useAppearance";
import { useTheme } from "@/hooks/useTheme";
import { backgrounds } from "@/services/appearanceService";
import "@/styles/personalization.css";

export function Personalization({ open, onClose }: { open: boolean; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const { settings, update, reset, upload, remove, custom, wallpaper, loading, error } = useAppearance();
  const { themeMode, effectiveMode, setMode } = useTheme();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
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
  const run = async (action: () => Promise<void>) => {
    setBusy(true); setMessage("");
    try { await action(); }
    catch (reason) { setMessage(reason instanceof Error ? reason.message : "操作失败，请重试"); }
    finally { setBusy(false); }
  };
  return <dialog ref={dialog} className="personalization" aria-labelledby="personalization-title" onCancel={onClose} onClose={onClose} onClick={event => {
    if (event.target === event.currentTarget) {
      const rect = event.currentTarget.getBoundingClientRect();
      if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) onClose();
    }
  }}>
    <header className="personalization-header">
      <div><span className="personalization-eyebrow"><Palette size={14} /> 外观设置</span><h2 id="personalization-title">个性化</h2><p>给这里，换一种心情。</p></div>
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
        <div className="personalization-upload-heading"><span><ImagePlus size={15} /> 自己的风景</span>{(custom.light || custom.dark) && <button type="button" className="personalization-text-button" disabled={busy} onClick={() => update({ background: "custom" })} aria-pressed={settings.background === "custom"}>{settings.background === "custom" ? "正在使用" : "使用这组"}</button>}</div>
        <div className="personalization-uploads">
          {(["light", "dark"] as const).map(mode => <div className="personalization-upload" key={mode}>
            <label className={custom[mode] ? "has-image" : ""}>
              {custom[mode] && <img src={custom[mode]} alt={mode === "light" ? "自定义日景" : "自定义夜景"} />}
              <span><Upload size={16} />{mode === "light" ? "上传日景" : "上传夜景"}</span>
              <input type="file" accept="image/jpeg,image/png,image/webp,image/avif" aria-label={mode === "light" ? "上传日景" : "上传夜景"} disabled={busy || loading} onChange={event => {
                const file = event.target.files?.[0]; event.target.value = "";
                if (file) void run(() => upload(mode, file));
              }} />
            </label>
            {custom[mode] && <button type="button" className="personalization-remove" aria-label={`移除${mode === "light" ? "日景" : "夜景"}`} disabled={busy} onClick={() => void run(() => remove(mode))}><X size={12} /></button>}
          </div>)}
        </div>
        <p className="personalization-hint">图片仅保存在当前浏览器。只上传一张时，日夜共用。</p>
      </section>
      <section className="personalization-section">
        <div className="personalization-heading"><h3>外观与阅读</h3></div>
        <div className="personalization-modes" role="group" aria-label="明暗模式">
          {([{ id: "auto", label: "随时间" }, { id: "light", label: "浅色", icon: Sun }, { id: "dark", label: "深色", icon: Moon }] as const).map(mode => <button type="button" key={mode.id} aria-pressed={themeMode === mode.id} onClick={() => setMode(mode.id)}>{"icon" in mode && <mode.icon size={13} />}{mode.label}</button>)}
        </div>
        <p className="personalization-hint">随时间：06:00–18:00 日景，其余时间夜景。</p>
        <Range name="背景亮度" id="appearance-brightness" min={60} max={120} value={settings.brightness} unit="%" onChange={value => update({ brightness: value })} />
        <Range name="背景模糊" id="appearance-blur" min={0} max={12} value={settings.blur} unit="px" onChange={value => update({ blur: value })} />
        <label className="personalization-switch"><span>滚动后柔化背景</span><input type="checkbox" checked={settings.scrollBlur} onChange={event => update({ scrollBlur: event.target.checked })} /></label>
        <Range name="卡片不透明度" id="appearance-opacity" min={40} max={100} value={settings.cardOpacity} unit="%" onChange={value => update({ cardOpacity: value })} />
        <Range name="阅读字号" id="appearance-font" min={13} max={22} value={settings.fontSize} unit="px" onChange={value => update({ fontSize: value })} />
      </section>
      <div className="personalization-status" role="status" aria-live="polite">{busy ? "正在处理图片…" : message || error || "更改自动保存，只对当前浏览器生效。"}</div>
    </div>
    <footer className="personalization-footer">
      <button type="button" className="personalization-reset" disabled={busy || loading} onClick={() => void run(async () => { await reset(); setMode("auto"); })}><RotateCcw size={14} /> 恢复默认</button>
      <button type="button" className="personalization-done" onClick={onClose}>完成</button>
    </footer>
  </dialog>;
}

function Range({ id, name, min, max, value, unit, onChange }: { id: string; name: string; min: number; max: number; value: number; unit: string; onChange: (value: number) => void }) {
  return <div className="personalization-range"><div><label htmlFor={id}>{name}</label><output htmlFor={id}>{value}{unit}</output></div><input id={id} type="range" min={min} max={max} value={value} onChange={event => onChange(Number(event.target.value))} /></div>;
}
