import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { useAuth } from "./useAuth";
const Context = createContext({ unread: 0, refresh: async () => {} });
export const useFeedbackNotifications = () => useContext(Context);
export function FeedbackNotificationsProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const owner = !!user?.is_owner;
  const [unread, setUnread] = useState(0);
  const refresh = useCallback(async () => {
    if (!owner) return;
    try {
      const response = await fetch("/api/admin/feedback/unread", { cache: "no-store" });
      if (!response.ok) return;
      const data = await response.json(); setUnread(Number(data.unread) || 0);
    } catch { /* Preserve the last known count while offline. */ }
  }, [owner]);
  useEffect(() => {
    if (!owner) { setUnread(0); return; }
    let active = true;
    const poll = () => { if (active && document.visibilityState === "visible") void refresh(); };
    poll();
    const timer = window.setInterval(poll, 60000);
    window.addEventListener("focus", poll); document.addEventListener("visibilitychange", poll);
    return () => { active = false; clearInterval(timer); window.removeEventListener("focus", poll); document.removeEventListener("visibilitychange", poll); };
  }, [owner, refresh]);
  return <Context.Provider value={{ unread: owner ? unread : 0, refresh }}>{children}</Context.Provider>;
}
export function FeedbackLabel() {
  const { user } = useAuth();
  const { unread } = useFeedbackNotifications();
  return <span className="inline-flex items-center gap-2">{user?.is_owner ? "意见收件箱" : "留言板"}{unread > 0 && <><span className="inline-block w-2 h-2 rounded-full bg-red-500" aria-hidden="true" /><span className="sr-only">{unread} 条未读留言</span></>}</span>;
}

export function FeedbackUnreadDot() {
  const { unread } = useFeedbackNotifications();
  return unread > 0 ? <span className="inline-flex ml-2"><span className="w-2 h-2 rounded-full bg-red-500" aria-hidden="true" /><span className="sr-only">{unread} 条未读留言</span></span> : null;
}
