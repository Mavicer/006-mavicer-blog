import { PageShell } from "@/components/PageShell";
import { site } from "@/config/site";

export default function About() {
  const a = site.about;
  return (
    <PageShell>
      <div className="article-content-container">
        <h1 className="text-4xl font-bold mb-2 text-first-text">{a.name}</h1>
        <p className="text-lg text-second-text mb-1">{a.role}</p>
        <p className="text-third-text mb-6">
          {a.school} · {a.location}
        </p>

        <div className="flex flex-col gap-2 mb-8 text-sm">
          <span>
            <i className="fa-solid fa-envelope mr-2 text-primary" />
            <a href={`mailto:${a.email}`} className="hover:text-primary">
              {a.email}
            </a>
          </span>
          <span>
            <i className="fa-brands fa-github mr-2 text-primary" />
            <a href={a.github} target="_blank" rel="noopener noreferrer" className="hover:text-primary">
              {a.github.replace("https://", "")}
            </a>
          </span>
        </div>

        <h2 className="text-2xl font-bold mb-3 text-first-text border-b border-border pb-2">
          Profile
        </h2>
        <p className="markdown-body whitespace-pre-line mb-8">{a.bio}</p>

        <h2 className="text-2xl font-bold mb-3 text-first-text border-b border-border pb-2">
          Interests
        </h2>
        <ul className="list-disc pl-6 mb-8">
          {a.profile.map((line: string) => (
            <li key={line} className="mb-1">
              {line}
            </li>
          ))}
        </ul>
      </div>
    </PageShell>
  );
}
