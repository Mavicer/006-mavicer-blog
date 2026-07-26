import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

/** Floating account dock (bottom-right), mirrors original .aleph-account-dock. */
export function AccountDock() {
  const { user } = useAuth();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // appear shortly after mount, like the original site
    const t = setTimeout(() => setVisible(true), 400);
    return () => clearTimeout(t);
  }, []);

  return (
    <Link
      to={user ? "/account" : "/login"}
      className="aleph-account-dock"
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(20px)",
      }}
      aria-label={user ? "账户与收藏" : "登录"}
    >
      {user ? (
        <>
          <i className="fa-regular fa-circle-user" />
          <span>{user.display_name || user.username}</span>
        </>
      ) : (
        <>
          <i className="fa-regular fa-right-to-bracket" />
          <span>登录</span>
        </>
      )}
    </Link>
  );
}
