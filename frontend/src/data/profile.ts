// profile.ts — single source of truth for the site owner's personal data.
// All components that surface personal info read from here (or from
// site.ts for shared identity). Keep this isolated so it can be swapped
// for a CMS/API in the future without touching component code.

export const profile = {
  /** GitHub handle + URL — powers the hero pill. */
  github: {
    handle: "Mavicer",
    url: "https://github.com/Mavicer",
  },
  /** Personal intro tags shown on the home sidebar card. These are NOT
   *  article tags — they are a fixed self-description, decoupled from
   *  the article taxonomy (article.tags / profile.tags stay separate). */
  tags: [
    "NUAA",
    "AI_agent",
    "摄影",
    "钢琴",
    "Animenz",
    "Logic_Pro",
    "健身",
    "Computer_Science",
  ],
} as const;

export type Profile = typeof profile;
