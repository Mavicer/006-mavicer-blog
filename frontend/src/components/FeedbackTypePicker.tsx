import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";
const options = [{ value: "bug", label: "报告 Bug" }, { value: "suggestion", label: "提出建议" }, { value: "other", label: "其他留言" }];
export function FeedbackTypePicker({ value, onChange, disabled }: { value: string; onChange: (value: string) => void; disabled: boolean }) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return;
    function outside(event: PointerEvent) { if (!root.current?.contains(event.target as Node)) setOpen(false); }
    document.addEventListener("pointerdown", outside);
    const selected = root.current?.querySelector<HTMLButtonElement>('[aria-selected="true"]');
    selected?.focus();
    return () => document.removeEventListener("pointerdown", outside);
  }, [open]);
  return <div className="feedback-picker" ref={root} onKeyDown={event => {
    if (event.key === "Escape") { event.preventDefault(); setOpen(false); trigger.current?.focus(); }
    if (event.key === "Tab") setOpen(false);
    if (open && ["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) {
      event.preventDefault();
      const buttons = Array.from(root.current!.querySelectorAll<HTMLButtonElement>('[role="option"]'));
      const current = buttons.indexOf(document.activeElement as HTMLButtonElement);
      const index = event.key === "Home" ? 0 : event.key === "End" ? buttons.length - 1 : (current + (event.key === "ArrowDown" ? 1 : -1) + buttons.length) % buttons.length;
      buttons[index]?.focus();
    }
  }}>
    <span id="feedback-type-label">留言类型</span>
    <button type="button" ref={trigger} disabled={disabled} className="feedback-picker-trigger" aria-labelledby="feedback-type-label feedback-type-value" aria-haspopup="listbox" aria-expanded={open} aria-controls={open ? "feedback-type-options" : undefined} onClick={() => setOpen(!open)} onKeyDown={event => { if (["ArrowDown", "ArrowUp"].includes(event.key)) { event.preventDefault(); setOpen(true); } }}>
      <span id="feedback-type-value">{options.find(option => option.value === value)?.label}</span><ChevronDown size={16} aria-hidden="true" />
    </button>
    {open && <div className="feedback-picker-menu" id="feedback-type-options" role="listbox" aria-labelledby="feedback-type-label">{options.map(option => <button type="button" role="option" aria-selected={value === option.value} key={option.value} onClick={() => { onChange(option.value); setOpen(false); trigger.current?.focus(); }}>{option.label}{value === option.value && <Check size={16} aria-hidden="true" />}</button>)}</div>}
  </div>;
}
