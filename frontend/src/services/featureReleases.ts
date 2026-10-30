export const FEATURE_NOTICE_MS = 5 * 24 * 60 * 60 * 1000;
export const FEATURE_READ_EVENT = "mavicer-feature-read";
export type FeatureRelease = { id: string; releasedAt: string };
export type FeatureStorage = Pick<Storage, "getItem" | "setItem">;
export const featureReleases = {
  personalization: {
    id: "personalization-v1",
    releasedAt: "2026-10-27T00:00:00+08:00",
  },
} satisfies Record<string, FeatureRelease>;
const key = (release: FeatureRelease) => `MAVICER_FEATURE_SEEN:${release.id}`;

export function isFeatureUnread(
  release: FeatureRelease,
  storage: FeatureStorage,
  now = Date.now(),
): boolean {
  const launched = Date.parse(release.releasedAt);
  if (
    !Number.isFinite(launched) ||
    now < launched ||
    now >= launched + FEATURE_NOTICE_MS
  )
    return false;
  try {
    return !storage.getItem(key(release));
  } catch {
    return false;
  }
}
export function markFeatureRead(
  release: FeatureRelease,
  storage: FeatureStorage,
): boolean {
  try {
    storage.setItem(key(release), "1");
    return true;
  } catch {
    return false;
  }
}
