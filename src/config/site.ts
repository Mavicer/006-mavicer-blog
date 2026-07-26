// Site identity, hardcoded here as the single source of truth.
// Edit these values to make the blog yours. Both frontend and backend read them.

export const site = {
  name: "Mavicer's Blog",
  subtitle: "Create beyond the lines",
  author: "Mavicer",
  announcement: "记录 AI 开发、项目实践、CTF 与学习思考。",
  footerStart: "2026/07/25 00:00:00",
  copyrightYear: 2026,
  about: {
    name: "Mavicer",
    role: "Undergraduate Student, Artificial Intelligence",
    school: "Nanjing University of Aeronautics and Astronautics",
    location: "Nanjing, China",
    email: "your@email.com",
    github: "https://github.com/yourname",
    bio: `I am an undergraduate student in Artificial Intelligence at Nanjing
University of Aeronautics and Astronautics. My interests lie in AI-native
software development, full-stack systems, algorithms, CTF security, and learning.`,
    profile: [
      "AI-native software development",
      "Full-stack systems & engineering",
      "Algorithms and data structures",
      "CTF security",
    ],
  },
};

export type Site = typeof site;
