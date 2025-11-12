// src/auth/AuthProvider.tsx  (ajusta paths si tu árbol es /app/)
import { createContext, useContext, useMemo, useState, useEffect } from "react";
import {
  login as apiLogin,
  logout as apiLogout,
  me as apiMe,
  type User,
} from "./api";
import { http } from "../lib/http";
import { getCookie, setAccessToken } from "../auth/token";

type AuthCtx = {
  user: User | null;
  login: (nroSocio: number, password: string) => Promise<User>;
  logout: () => Promise<void>;
  ready: boolean;
};

const Ctx = createContext<AuthCtx | undefined>(undefined);
export const useAuth = () => {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAuth must be used within <AuthProvider>");
  return ctx;
};
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);

  // precarga (pero OJO: no es fuente de verdad)
  useEffect(() => {
    const cached = sessionStorage.getItem("me");
    if (cached) {
      try {
        setUser(JSON.parse(cached) as User);
      } catch {}
    }
  }, []);

  const login = async (nroSocio: number, password: string) => {
    const u = await apiLogin(nroSocio, password);
    setUser(u);
    sessionStorage.setItem("me", JSON.stringify(u));
    return u;
  };

  const logout = async () => {
    await apiLogout();
    setUser(null);
    setAccessToken(null);
    sessionStorage.removeItem("me");
    delete http.defaults.headers.common["Authorization"];
  };

  useEffect(() => {
    (async () => {
      try {
        const csrf = getCookie("csrf_token");
        // 💡 si NO hay cookies ni Authorization => no hay sesión válida
        const hasAuthHeader = !!http.defaults.headers.common["Authorization"];
        if (!csrf && !hasAuthHeader) {
          setUser(null);
          sessionStorage.removeItem("me");
          setAccessToken(null);
          delete http.defaults.headers.common["Authorization"];
          setReady(true);
          return;
        }

        // si hay csrf, intentamos refresh
        if (csrf) {
          const r = await http.post("/auth/refresh", null, {
            headers: { "X-CSRF-Token": csrf },
          });
          setAccessToken(r.data.access_token);
          http.defaults.headers.common[
            "Authorization"
          ] = `Bearer ${r.data.access_token}`;
        }

        // fuente de verdad
        const u = await apiMe();
        setUser(u);
        sessionStorage.setItem("me", JSON.stringify(u));
      } catch {
        setUser(null);
        setAccessToken(null);
        sessionStorage.removeItem("me");
        delete http.defaults.headers.common["Authorization"];
      } finally {
        setReady(true);
      }
    })();
  }, []);

  const value = useMemo(
    () => ({ user, login, logout, ready, isAuthenticated: !!user }),
    [user, ready]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
