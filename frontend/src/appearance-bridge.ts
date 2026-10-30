import {
  APPEARANCE_KEY,
  defaults,
  normalizeAppearance,
  readCustomImages,
} from "./services/appearanceService";
import { NEXUS_URL } from "./config/nexus";

export function savedSnapshot(storage: Pick<Storage, "getItem">) {
  try {
    const raw = storage.getItem(APPEARANCE_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : null;
    const appearance =
      parsed && typeof parsed === "object" && !Array.isArray(parsed)
        ? normalizeAppearance(parsed)
        : null;
    const storedTheme = storage.getItem("MAVICER_THEME_MODE");
    const theme =
      storedTheme === "dark" || storedTheme === "light" ? storedTheme : "auto";
    const configured = !!appearance || theme !== "auto";
    return {
      configured,
      settings: configured ? (appearance ?? defaults) : null,
      theme,
    };
  } catch {
    return { configured: false, settings: null, theme: "auto" as const };
  }
}
export function acceptsAppearanceRequest(
  event: Pick<MessageEvent, "origin" | "data">,
  trustedOrigin: string,
) {
  return (
    event.origin === trustedOrigin &&
    event.data?.type === "NEXUS_APPEARANCE_REQUEST" &&
    typeof event.data.nonce === "string" &&
    /^[a-zA-Z0-9-]{16,64}$/.test(event.data.nonce)
  );
}

if (typeof window !== "undefined" && window.parent !== window) {
  const trustedOrigin = new URL(NEXUS_URL).origin;
  let nonce: string | null = null;
  let generation = 0;
  let pending: ReturnType<typeof setTimeout> | undefined;
  async function send() {
    if (!nonce) return;
    const serial = ++generation;
    let snapshot: ReturnType<typeof savedSnapshot>;
    try {
      snapshot = savedSnapshot(window.localStorage);
    } catch {
      snapshot = { configured: false, settings: null, theme: "auto" };
    }
    let images = {};
    if (snapshot.settings?.background === "custom") {
      try {
        images = await readCustomImages();
      } catch {
        /* Receiver falls back to the default image. */
      }
    }
    if (serial !== generation) return;
    window.parent.postMessage(
      {
        type: "BLOG_APPEARANCE_SNAPSHOT",
        nonce,
        snapshot: { ...snapshot, images },
      },
      trustedOrigin,
    );
  }
  window.addEventListener("message", (event) => {
    if (
      event.source !== window.parent ||
      !acceptsAppearanceRequest(event, trustedOrigin)
    )
      return;
    nonce = event.data.nonce;
    void send();
  });
  window.addEventListener("storage", (event) => {
    if (
      event.key !== null &&
      ![APPEARANCE_KEY, "MAVICER_THEME_MODE"].includes(event.key)
    )
      return;
    if (pending) clearTimeout(pending);
    pending = setTimeout(() => void send(), 100);
  });
}
