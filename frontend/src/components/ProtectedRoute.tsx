import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

/** UX route guard; the API independently checks the server session and role. */
export function ProtectedRoute({
  children,
  requireOwner = false,
}: {
  children: React.ReactNode;
  requireOwner?: boolean;
}) {
  const { user, loading, error, refresh } = useAuth();
  const location = useLocation();

  if (loading) return <p role="status" className="p-6">正在确认登录状态…</p>;
  if (error) return <p role="alert" className="p-6">{error} <button onClick={() => void refresh()}>重试</button></p>;
  if (!user) {
    return <Navigate to={`/login?next=${location.pathname}`} replace />;
  }

  if (requireOwner && !user.is_owner) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
