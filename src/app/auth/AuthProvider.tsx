import { useMemo, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  login as apiLogin,
  logout as apiLogout,
  me as apiMe,
  type User,
} from "./api";
import { http } from "@/app/shared/lib/http";
import { getAccessToken, getCookie, setAccessToken } from "../auth/token";
import { refreshSession, listenRemoteLogout, type LogoutMotivo } from "./session";
import { Ctx } from "./useAuth";
import { anotarIngreso } from "@/app/features/avisoIngreso/reglasAviso";
import { olvidarCatalogos } from "@/app/pages/facturacion/CargaFacturacion/catalogosCarga";

// Versiones anteriores guardaban acá una copia del usuario con sus permisos: se borra para no dejar datos viejos.
try {
  sessionStorage.removeItem("me");
} catch {
  // storage bloqueado: no hay nada que limpiar.
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  const navigate = useNavigate();

  const login = async (nroSocio: number, password: string) => {
    const u = await apiLogin(nroSocio, password);
    setUser(u);
    anotarIngreso(u);
    return u;
  };

  const logout = async () => {
    await apiLogout();
    setUser(null);
    setAccessToken(null);
    delete http.defaults.headers.common["Authorization"];
    olvidarCatalogos();
  };

  // Cierre de sesión forzado: por el interceptor de http.ts (401 que no se pudo refrescar) en esta pestaña, o por otra pestaña vía BroadcastChannel.
  useEffect(() => {
    const goToLogin = (motivo: LogoutMotivo) => {
      setUser(null);
      olvidarCatalogos();
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
          setReady(true);
          return;
        }

        if (!token && csrf) {
          // hay cookie de refresh pero ningún access todavía: hace falta un refresh explícito antes de poder pedir /auth/me.
          const newToken = await refreshSession();
          http.defaults.headers.common["Authorization"] = `Bearer ${newToken}`;
        }

        // fuente de verdad. El access token vive solo en memoria: tras un reload se obtuvo recién con el refresh de arriba.
        const u = await apiMe();
        if (cancelled) return;
        setUser(u);
      } catch {
        if (cancelled) return;
        setUser(null);
        setAccessToken(null);
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
