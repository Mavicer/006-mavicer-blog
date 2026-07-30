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
    role: "Undergraduate Student, Artificial Intelligence",
    school: "Nanjing University of Aeronautics and Astronautics",
    location: "Nanjing, China",
    email: "leonkong0810@gmail.com",
    qq: "2096014086@qq.com",
    wechat: "Ks2008810",
    github: "https://github.com/Mavicer",
    bio: `I am an AI undergraduate student and independent developer who enjoys building things with emerging technologies.

My focus is on AI-native applications, full-stack development, and intelligent systems. I am fascinated by how large language models can reshape software creation, productivity, and human-computer interaction.

I learn by building — from AI tools and web applications to experimental systems — continuously exploring new ways to turn ideas into reality`,
    profile: [
      "AI-native software development",
      "Large language models & AI agents",
      "Full-stack engineering and modern web architecture",
      "AI-powered products and developer tools",
      "Algorithms and problem solving",
      "Creative technology, photography & music production",
      "Fitness, strength training and sports",
    ],
  },
};

export type Site = typeof site;
