import { createContext, useCallback, useContext, useEffect, useState } from "react";
import * as api from "@/lib/api";
import type { User } from "@/lib/api";

type AuthCtx = {
  user: User | null; loading: boolean; error: string;
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, password: string, display_name: string) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
};
const Ctx = createContext<AuthCtx>(null as unknown as AuthCtx);
export const useAuth = () => useContext(Ctx);
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const refresh = useCallback(async () => {
    try {
      const me = await api.me(); api.storeSession({ user: me }); setUser(me); setError("");
    } catch (e: any) {
      api.clearSession(); setUser(null);
      setError(e?.status === 401 ? "" : "账户服务暂时无法连接，请稍后重试");
    } finally { setLoading(false); }
  }, []);
  useEffect(() => {
    api.clearSession(); void refresh();
    const onFocus = () => { void refresh(); };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [refresh]);
  const login = async (username: string, password: string) => {
    setLoading(true);
    try { const result = await api.login({ username, password }); api.storeSession(result); setUser(result.user); setError(""); }
    finally { setLoading(false); }
  };
  const register = async (username: string, password: string, display_name: string) => {
    setLoading(true);
    try { const result = await api.register({ username, password, display_name }); api.storeSession(result); setUser(result.user); setError(""); }
    finally { setLoading(false); }
  };
  const logout = async () => { await api.logout(); setUser(null); };
  return <Ctx.Provider value={{ user, loading, error, login, register, logout, refresh }}>{children}</Ctx.Provider>;
}
