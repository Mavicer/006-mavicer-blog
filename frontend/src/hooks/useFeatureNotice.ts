import { useCallback, useEffect, useState } from "react";
import {
  FEATURE_NOTICE_MS,
  FEATURE_READ_EVENT,
  isFeatureUnread,
  markFeatureRead,
  type FeatureRelease,
} from "@/services/featureReleases";

export function useFeatureNotice(release: FeatureRelease) {
  const [unread, setUnread] = useState(false);
  useEffect(() => {
    const sync = () => {
      try {
        setUnread(isFeatureUnread(release, window.localStorage));
      } catch {
        setUnread(false);
      }
    };
    const launched = Date.parse(release.releasedAt);
    const expiry = launched + FEATURE_NOTICE_MS;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const schedule = () => {
      sync();
      const now = Date.now();
      const next = now < launched ? launched : expiry;
      if (Number.isFinite(next) && next > now)
        timer = setTimeout(schedule, Math.min(next - now, 2_147_483_647));
    };
    schedule();
    window.addEventListener("storage", sync);
    window.addEventListener("focus", sync);
    window.addEventListener(FEATURE_READ_EVENT, sync);
    return () => {
      if (timer) clearTimeout(timer);
      window.removeEventListener("storage", sync);
      window.removeEventListener("focus", sync);
      window.removeEventListener(FEATURE_READ_EVENT, sync);
    };
  }, [release]);
  const markRead = useCallback(() => {
    setUnread(false);
    try {
      markFeatureRead(release, window.localStorage);
    } catch {
      /* Storage can be disabled. */
    }
    window.dispatchEvent(new Event(FEATURE_READ_EVENT));
  }, [release]);
  return { unread, markRead };
}
