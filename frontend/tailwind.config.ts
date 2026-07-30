import type { Config } from "tailwindcss";

// Tailwind config that maps the Redefine theme's CSS variables to utility
// classes, so we can write `bg-background`, `text-primary`, `shadow-redefine`,
// etc. exactly like the original site's HTML.
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        background: "var(--background-color)",
        "background-transparent": "var(--background-color-transparent)",
        "background-transparent-15": "var(--background-color-transparent-15)",
        "background-transparent-40": "var(--background-color-transparent-40)",
        "background-transparent-80": "var(--background-color-transparent-80)",
        "second-background": "var(--second-background-color)",
        "third-background": "var(--third-background-color)",
        "third-background-transparent":
          "var(--third-background-color-transparent)",
        primary: "var(--primary-color)",
        "first-text": "var(--first-text-color)",
        "second-text": "var(--second-text-color)",
        "third-text": "var(--third-text-color)",
        "fourth-text": "var(--fourth-text-color)",
        "default-text": "var(--default-text-color)",
        "invert-text": "var(--invert-text-color)",
        border: "var(--border-color)",
        selection: "var(--selection-color)",
        "home-banner-text": "var(--home-banner-text-color)",
      },
      fontFamily: {
        chillax: ["'Chillax-Variable'", "sans-serif"],
        sans: [
          "'Geist Variable'",
          "Noto Sans SC",
          "-apple-system",
          "BlinkMacSystemFont",
          "'PingFang SC'",
          "'Microsoft YaHei'",
          "'Heiti SC'",
          "'WenQuanYi Micro Hei'",
          "sans-serif",
        ],
        mono: ["'Geist Mono'", "ui-monospace", "SFMono-Regular", "monospace"],
      },
      borderRadius: {
        redefine: "18px",
        "redefine-small": "12px",
        "redefine-tiny": "9px",
      },
      boxShadow: {
        redefine:
          "var(--shadow-color-2) 0px 6px 24px 0px, var(--shadow-color-1) 0px 0px 0px 1px",
        "redefine-hover":
          "var(--shadow-color-2) 0px 6px 24px 0px, var(--shadow-color-1) 0px 0px 0px 1px, var(--shadow-color-1) 0px 0px 0px 1px inset",
        "redefine-flat":
          "var(--shadow-color-2) 0px 1px 4px 0px, var(--shadow-color-1) 0px 0px 0px 1px",
        "redefine-flat-hover":
          "var(--shadow-color-2) 0px 1px 4px 0px, var(--shadow-color-1) 0px 0px 0px 1px, var(--shadow-color-1) 0px 0px 0px 1px inset",
      },
      maxWidth: {
        content: "1000px",
        "navbar-home": "1200px",
        "navbar-page": "1000px",
      },
      transitionDuration: {
        "400": "400ms",
      },
    },
  },
  plugins: [],
} satisfies Config;
