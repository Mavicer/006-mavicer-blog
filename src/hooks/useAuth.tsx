import { createContext, useCallback, useContext, useEffect, useState } from "react";
import * as auth from "@/auth/auth";
import type { User } from "@/auth/auth";

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
  const [user, setUser] = useState<User | null>(auth.currentUser());
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    const me = auth.currentUser();
    setUser(me);
  }, []);

  useEffect(() => {
    // Seed the default owner account on first load.
    auth.seedOwner();
    refresh();
  }, [refresh]);

  const login = useCallback(async (username: string, password: string) => {
    setLoading(true);
    try {
      const result = auth.login({ username, password });
      auth.storeSession(result);
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
        const result = auth.register(payload);
        auth.storeSession(result);
        setUser(result.user);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const logout = useCallback(() => {
    auth.logout();
    setUser(null);
  }, []);

  return (
    <Ctx.Provider value={{ user, loading, login, register, logout, refresh }}>
      {children}
    </Ctx.Provider>
  );
}
