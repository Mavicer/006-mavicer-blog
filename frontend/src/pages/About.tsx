import { PageShell } from "@/components/PageShell";
import { site } from "@/config/site";

export default function About() {
  const a = site.about;
  return (
    <PageShell>
      <div className="article-content-container">
        {/* Name — extra-large display heading */}
        <h1 className="text-5xl font-bold mb-3 text-first-text leading-tight">
          {a.name}
        </h1>

        {/* Role + location */}
        <p className="text-xl text-second-text mb-1">{a.role}</p>
        <p className="text-base text-third-text mb-8">
          {a.school} · {a.location}
        </p>

        {/* Contact links */}
        <div className="flex flex-col gap-2.5 mb-10 text-sm">
          <span className="flex items-center gap-2.5">
            <i className="fa-solid fa-envelope text-primary w-5 text-center" />
            <span className="text-third-text">Google：</span>
            <a href={`mailto:${a.email}`} className="hover:text-primary transition-colors">
              {a.email}
            </a>
          </span>
          <span className="flex items-center gap-2.5">
            <i className="fa-solid fa-comment text-primary w-5 text-center" />
            <span className="text-third-text">QQ：</span>
            <a href={`mailto:${a.qq}`} className="hover:text-primary transition-colors">
              {a.qq}
            </a>
          </span>
          <span className="flex items-center gap-2.5">
            <i className="fa-brands fa-weixin text-primary w-5 text-center" />
            <span className="text-third-text">WeChat：</span>
            <span className="text-second-text">{a.wechat}</span>
          </span>
          <span className="flex items-center gap-2.5">
            <i className="fa-brands fa-github text-primary w-5 text-center" />
            <span className="text-third-text">GitHub：</span>
            <a href={a.github} target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors">
              {a.github.replace("https://", "")}
            </a>
          </span>
        </div>

        {/* Profile */}
        <h2 className="text-2xl font-bold mb-4 text-first-text border-b border-border pb-2">
          Profile
        </h2>
        <p className="markdown-body whitespace-pre-line mb-10 leading-relaxed">
          {a.bio}
        </p>

        {/* Interests */}
        <h2 className="text-2xl font-bold mb-4 text-first-text border-b border-border pb-2">
          Interests
        </h2>
        <ul className="list-disc pl-6 mb-8">
          {a.profile.map((line: string) => (
            <li key={line} className="mb-1.5 leading-relaxed">
              {line}
            </li>
          ))}
        </ul>
      </div>
    </PageShell>
  );
}
