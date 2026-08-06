import { createContext, useContext, useMemo, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  login as apiLogin,
  logout as apiLogout,
  me as apiMe,
  type User,
} from "./api";
import { http } from "../lib/http";
import { getAccessToken, getCookie, setAccessToken } from "../auth/token";
import { refreshSession, listenRemoteLogout, type LogoutMotivo } from "./session";

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
  const navigate = useNavigate();

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

  // Cierre de sesión forzado: por el interceptor de http.ts (401 que no se
  // pudo refrescar) en esta pestaña, o por otra pestaña vía BroadcastChannel.
  useEffect(() => {
    const goToLogin = (motivo: LogoutMotivo) => {
      setUser(null);
      sessionStorage.removeItem("me");
      navigate("/panel/login", { replace: true, state: { motivo } });
    };
    const onLocalLogout = (ev: Event) => {
      goToLogin((ev as CustomEvent<LogoutMotivo>).detail);
    };
    window.addEventListener("auth:logout", onLocalLogout);
    const unsubscribeRemote = listenRemoteLogout(goToLogin);
    return () => {
      window.removeEventListener("auth:logout", onLocalLogout);
      unsubscribeRemote();
    };
  }, [navigate]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const token = getAccessToken();
        const csrf = getCookie("csrf_token");

        if (!token && !csrf) {
          // sin access en memoria y sin cookie de sesión: no hay nada que restaurar
          setUser(null);
          sessionStorage.removeItem("me");
          setReady(true);
          return;
        }

        if (!token && csrf) {
          // hay cookie de refresh pero ningún access todavía: hace falta un
          // refresh explícito antes de poder pedir /auth/me. Pasa por el
          // mismo single-flight que usa el interceptor de http.ts.
          const newToken = await refreshSession();
          http.defaults.headers.common["Authorization"] = `Bearer ${newToken}`;
        }

        // fuente de verdad. Si el access de sessionStorage seguía siendo
        // válido, esto responde directo; si venció, el interceptor de
        // http.ts refresca una sola vez y reintenta antes de llegar acá.
        const u = await apiMe();
        if (cancelled) return;
        setUser(u);
        sessionStorage.setItem("me", JSON.stringify(u));
      } catch {
        if (cancelled) return;
        setUser(null);
        setAccessToken(null);
        sessionStorage.removeItem("me");
        delete http.defaults.headers.common["Authorization"];
      } finally {
        if (!cancelled) setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const value = useMemo(
    () => ({ user, login, logout, ready, isAuthenticated: !!user }),
    [user, ready]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
