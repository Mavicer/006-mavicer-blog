import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

/**
 * Route guard for protected pages.
 *
 * ⚠️  This is FRONTEND-ONLY UX protection. It prevents casual users
 *     from stumbling into admin pages, but anyone with DevTools can
 *     forge a session. Production auth must be enforced server-side.
 *
 * - Not logged in → redirect to /login?next=<path>
 * - Logged in but not owner (when requireOwner) → redirect to /
 */
export function ProtectedRoute({
  children,
  requireOwner = false,
}: {
  children: React.ReactNode;
  requireOwner?: boolean;
}) {
  const { user } = useAuth();
  const location = useLocation();

  if (!user) {
    return <Navigate to={`/login?next=${location.pathname}`} replace />;
  }

  if (requireOwner && !user.is_owner) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
