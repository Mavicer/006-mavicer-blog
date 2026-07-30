import { createContext, useCallback, useContext, useEffect, useState } from "react";
import * as api from "@/lib/api";
import type { User } from "@/lib/api";

type AuthCtx = {
  user: User | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  register: (payload: {
    username: string;
    email: string;
    password: string;
    display_name?: string;
    owner_key?: string;
  }) => Promise<void>;
  logout: () => void;
  refresh: () => Promise<void>;
};

const Ctx = createContext<AuthCtx>(null as any);
export const useAuth = () => useContext(Ctx);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(api.currentUser());
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    const me = api.currentUser();
    setUser(me);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const login = useCallback(async (username: string, password: string) => {
    setLoading(true);
    try {
      const result = await api.login({ username, password });
      api.storeSession(result);
      setUser(result.user);
    } finally {
      setLoading(false);
    }
  }, []);

  const register = useCallback(
    async (payload: {
      username: string;
      email: string;
      password: string;
      display_name?: string;
      owner_key?: string;
    }) => {
      setLoading(true);
      try {
        // Backend UserCreate has no email field; the email collected in the
        // form is cosmetic for now. Only username/password/display_name/owner_key
        // are sent to /auth/register.
        const result = await api.register({
          username: payload.username,
          password: payload.password,
          display_name: payload.display_name,
          owner_key: payload.owner_key,
        });
        api.storeSession(result);
        setUser(result.user);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const logout = useCallback(() => {
    api.logout();
    setUser(null);
  }, []);

  return (
    <Ctx.Provider value={{ user, loading, login, register, logout, refresh }}>
      {children}
    </Ctx.Provider>
  );
}
