// src/auth/AuthProvider.tsx
import { createContext, useContext, useMemo, useState, useEffect } from "react";
import { login as apiLogin, logout as apiLogout } from "./api";
import type { User } from "./api";
import { http } from "../lib/http";
import { getCookie, setAccessToken } from "../auth/token";

type AuthCtx = {
  user: User | null;
  login: (nroSocio: number, password: string) => Promise<void>;
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

  // ➊ Al montar: pre-cargar cache (opcional, mejora UX)
  useEffect(() => {
    const cached = sessionStorage.getItem("me");
    if (cached) {
      try { setUser(JSON.parse(cached) as User); } catch {}
    }
  }, []);

  const login = async (nroSocio: number, password: string) => {
    const u = await apiLogin(nroSocio, password);
    setUser(u);
    // ➋ Guardar en cache tras login
    sessionStorage.setItem("me", JSON.stringify(u));
  };

  const logout = async () => {
    await apiLogout();            // POST /auth/logout
    setUser(null);
    setAccessToken(null);
    sessionStorage.removeItem("me");
  };

  // Boot de sesión tras F5: refresh → /auth/me
  useEffect(() => {
    (async () => {
      try {
        const csrf = getCookie("csrf_token");
        if (!csrf) { setReady(true); return; }

        // 1) refresh
        const r = await http.post("/auth/refresh", null, {
          headers: { "X-CSRF-Token": csrf },
        });

        // 2) fija token en memoria + default header (clave para /auth/me)
        setAccessToken(r.data.access_token);
        http.defaults.headers.common["Authorization"] = `Bearer ${r.data.access_token}`;

        // 3) ahora sí /me
        const me = await http.get("/auth/me");
        const u = me.data.user as User;
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

  const value = useMemo(() => ({ user, login, logout, ready }), [user, ready]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
