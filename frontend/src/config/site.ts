// Site identity, hardcoded here as the single source of truth.
// Edit these values to make the blog yours. Both frontend and backend read them.

export const site = {
  name: "Mavicer's Blog",
  subtitle: "Humility brings us closest to greatness",
  author: "Mavicer",
  announcement: "记录 AI 开发、项目实践与学习思考。",
  footerStart: "2026/07/26 00:00:00",
  copyrightYear: 2026,
  about: {
    name: "Leon Kong",
    role: "Undergraduate Student in Artificial Intelligence",
    school: "Nanjing University of Aeronautics and Astronautics",
    location: "Nanjing, China",
    email: "leonkong0810@gmail.com",
    qq: "2096014086@qq.com",
    wechat: "Ks2008810",
    github: "https://github.com/Mavicer",
    bio: `I'm an undergraduate student majoring in Artificial Intelligence at Nanjing University of Aeronautics and Astronautics, with a strong interest in software development and emerging technologies.

I enjoy exploring how AI can be integrated into real-world applications, particularly through large language models, intelligent agents, and computer vision.

Beyond AI, I'm also interested in full-stack development, algorithms, and mathematical modeling.

I believe the best way to learn is by building. Through personal projects and continuous experimentation, I'm gradually strengthening my foundations in programming, mathematics, and engineering while exploring new ideas and possibilities.`,
    profile: [
      "Artificial intelligence & practical applications",
      "Large language models & AI agents",
      "Computer vision & intelligent systems",
      "Full-stack development & software engineering",
      "Mathematical modeling & algorithmic problem solving",
      "Creative technology, photography & music production",
      "Calisthenics, strength training & sports",
    ],
  },
};

export type Site = typeof site;
