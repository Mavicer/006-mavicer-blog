import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import "@/styles/nexus-announcement.css";

const SEEN_KEY = "MAVICER_NEXUS_ANNOUNCEMENT_V1";
import {
  NEXUS_ANNOUNCEMENT_ENABLED as enabled,
  NEXUS_URL as nexusUrl,
} from "@/config/nexus";

export function NexusAnnouncement() {
  const [open, setOpen] = useState(false);
  const [paused, setPaused] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const evaluated = useRef(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!enabled) return;
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
  }, []);

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

  const startVideo = useCallback(() => {
    const element = video.current;
    if (!element || !open || paused || document.visibilityState !== "visible") return;
    element.muted = true;
    element.defaultMuted = true;
    void element.play().then(() => setBlocked(false)).catch(() => setBlocked(true));
  }, [open, paused]);

  useEffect(() => {
    const sync = () => {
      if (!open || paused || document.visibilityState !== "visible") video.current?.pause();
      else startVideo();
    };
    sync();
    document.addEventListener("visibilitychange", sync);
    return () => document.removeEventListener("visibilitychange", sync);
  }, [open, paused, startVideo]);

  const togglePlayback = () => {
    if (paused || blocked) {
      setPaused(false);
      const element = video.current;
      if (element) {
        element.muted = true;
        element.defaultMuted = true;
        void element.play().then(() => setBlocked(false)).catch(() => setBlocked(true));
      }
    } else {
      video.current?.pause();
      setPaused(true);
    }
  };

  if (!enabled || !open) return null;
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
          <video
            ref={video}
            src="/media/nexus-intro.mp4"
            poster="/media/nexus-intro-poster.jpg"
            muted
            loop
            playsInline
            autoPlay
            preload="auto"
            onLoadedData={startVideo}
            onCanPlay={startVideo}
            aria-label="Nexus 赛事筛选与收藏功能演示"
          />
          <button
            type="button"
            className="nexus-announcement-playback"
            onClick={togglePlayback}
            aria-label={paused || blocked ? "播放演示" : "暂停演示"}
          >
            {paused || blocked ? (
              <svg
                width="14"
                height="14"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path d="m6 3 11 7-11 7z" />
              </svg>
            ) : (
              <svg
                width="14"
                height="14"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path d="M5 4h3v12H5zm7 0h3v12h-3z" />
              </svg>
            )}
          </button>
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
