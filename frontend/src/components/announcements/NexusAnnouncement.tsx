import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import "@/styles/nexus-announcement.css";

const SEEN_KEY = "MAVICER_NEXUS_ANNOUNCEMENT_V1";
import {
  NEXUS_ANNOUNCEMENT_ENABLED as enabled,
  NEXUS_URL as nexusUrl,
} from "@/config/nexus";

export function NexusAnnouncement({ autoShow = false, openRequest = 0 }: { autoShow?: boolean; openRequest?: number }) {
  const [open, setOpen] = useState(false);
  const evaluated = useRef(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!enabled || !autoShow) return;
    const reveal = () => {
      if (evaluated.current || document.visibilityState !== "visible") return;
      evaluated.current = true;
      // If persistence is unavailable, skip automatic display instead of repeating it.
      try {
        if (localStorage.getItem(SEEN_KEY)) return;
        localStorage.setItem(SEEN_KEY, "seen");
      } catch {
        return;
      }
      setOpen(true);
    };
    reveal();
    document.addEventListener("visibilitychange", reveal);
    return () => document.removeEventListener("visibilitychange", reveal);
  }, [autoShow]);

  useEffect(() => {
    if (openRequest <= 0) return;
    evaluated.current = true;
    try { localStorage.setItem(SEEN_KEY, "seen"); } catch { /* Manual opening works without storage. */ }
    setOpen(true);
  }, [openRequest]);

  useEffect(() => {
    if (!open || !dialog.current) return;
    const element = dialog.current;
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    element.showModal();
    document.body.style.overflow = "hidden";
    return () => {
      element.close();
      document.body.style.overflow = overflow;
      previous?.focus({ preventScroll: true });
    };
  }, [open]);

  if (!open) return null;
  return createPortal(
    <dialog
      ref={dialog}
      className="nexus-announcement"
      aria-labelledby="nexus-announcement-title"
      aria-describedby="nexus-announcement-description"
      onCancel={(e) => {
        e.preventDefault();
        close();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <div className="nexus-announcement-card">
        <button
          type="button"
          className="nexus-announcement-close"
          onClick={close}
          aria-label="关闭公告"
        >
          <svg
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
          >
            <path d="m6 6 12 12M18 6 6 18" />
          </svg>
        </button>
        <div className="nexus-announcement-media">
          <img
            src="/media/nexus-home.jpg"
            alt="Nexus 首页：赛事搜索、筛选与数学建模赛事列表"
            width={2462}
            height={1666}
          />
        </div>
        <div className="nexus-announcement-content">
          <div className="nexus-announcement-icon" aria-hidden="true">
            N
          </div>
          <h2 id="nexus-announcement-title">Nexus</h2>
          <p id="nexus-announcement-description">
            黑客松、数学建模、算法与 CTF。
            <br />
            查看参赛要求、报名时间和官方入口。
          </p>
          <a
            className="nexus-announcement-primary"
            href={nexusUrl}
            onClick={close}
          >
            查看赛事 <span aria-hidden="true">↗</span>
          </a>
          <button
            type="button"
            className="nexus-announcement-later"
            onClick={close}
          >
            暂时不用
          </button>
        </div>
      </div>
    </dialog>,
    document.body,
  );
}
