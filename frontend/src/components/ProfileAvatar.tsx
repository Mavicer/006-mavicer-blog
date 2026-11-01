import { useState } from "react";
import { Link } from "react-router-dom";

export function ProfileAvatar({ mobile = false }: { mobile?: boolean }) {
  const [dismissed, setDismissed] = useState(false);

  return (
    <Link
      to="/about"
      aria-label="查看个人简介"
      className="profile-avatar-link block shrink-0 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
      data-tooltip-dismissed={dismissed || undefined}
      onMouseLeave={() => setDismissed(false)}
      onBlur={() => setDismissed(false)}
      onKeyDown={event => {
        if (event.key === "Escape") setDismissed(true);
      }}
    >
      <img
        src="/images/avatar.jpg"
        alt=""
        loading="lazy"
        className={mobile ? "w-14 h-14 rounded-full object-cover" : "w-[110px] h-[110px] rounded-full object-cover"}
      />
      <span className="profile-avatar-tooltip" aria-hidden="true">查看个人简介</span>
    </Link>
  );
}
