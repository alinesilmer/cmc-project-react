import { useEffect, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, History, Home, LogOut, RotateCw, ShieldCheck, Undo2, UserCheck } from "lucide-react";
import PantallaAcceso, { type Destacado } from "@/app/features/acceso/components/PantallaAcceso/PantallaAcceso";
import { useAuth } from "@/app/auth/AuthProvider";
import { destinoDe, marcarSalto, pedirEnlaceLegacy, yaSeIntentoElSalto } from "@/app/auth/destino";
import Header from "@/website/components/UI/Header/Header";
import styles from "./SistemaAnterior.module.scss";

const DESTACADOS: Destacado[] = [
  { icono: UserCheck, texto: "Entrás con la misma cuenta" },
  { icono: ShieldCheck, texto: "Sin volver a poner la clave" },
  { icono: Undo2, texto: "Podés volver cuando quieras" },
];

// El enlace vence a los cinco minutos: se renueva antes para que el botón
// nunca apunte a uno muerto.
const RENOVAR_MS = 4 * 60 * 1000;

/**
 * Pantalla intermedia hacia el legacy. La primera vez salta sola; si el
 * usuario vuelve atrás —porque el legacy no cargó o porque terminó— se queda
 * acá y ofrece reintentar, volver al sitio o cerrar sesión, en vez de dejarlo
 * frente a la página de error del otro servidor.
 */
export default function SistemaAnterior() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [saltaSolo] = useState(() => !yaSeIntentoElSalto());

  const destino = user ? destinoDe(user) : null;
  const next = destino?.tipo === "legacy" ? destino.next : null;

  const enlace = useQuery({
    queryKey: ["legacy-sso-link", user?.id, next],
    queryFn: ({ signal }) => pedirEnlaceLegacy(next ?? "/", signal),
    enabled: next !== null,
    staleTime: RENOVAR_MS,
    refetchInterval: RENOVAR_MS,
    // Sin caché entre montajes: cada entrada a la pantalla pide su enlace.
    gcTime: 0,
    retry: 1,
  });
  const { data: url, isError, isFetching, refetch } = enlace;

  useEffect(() => {
    if (!saltaSolo || !url) return;
    marcarSalto();
    window.location.href = url;
  }, [saltaSolo, url]);

  // Al volver atrás el navegador puede restaurar la página congelada tal como
  // quedó: en modo «saltando», con un enlace quizá vencido y la sesión de
  // entonces. Se recarga para arrancar de cero; la marca del salto hace que
  // esta vez no vuelva a irse sola.
  useEffect(() => {
    const alVolver = (e: PageTransitionEvent) => {
      if (e.persisted) window.location.reload();
    };
    window.addEventListener("pageshow", alVolver);
    return () => window.removeEventListener("pageshow", alVolver);
  }, []);

  if (destino?.tipo === "panel") return <Navigate to={destino.ruta} replace />;

  const cerrarSesion = async () => {
    await logout();
    navigate("/panel/login", { replace: true });
  };

  const saltando = saltaSolo && !isError;

  return (
    <>
      <Header />
      <PantallaAcceso
        lema={
          <>
            El sistema de siempre, <em>a un paso.</em>
          </>
        }
        destacados={DESTACADOS}
      >
        <span className={styles.icono} aria-hidden="true">
          <History />
        </span>

        {saltando ? (
          <div role="status">
            <h1 className={styles.titulo}>Abriendo el sistema anterior…</h1>
            <p className={styles.bajada}>Un momento, ya te llevamos.</p>
            <div className={styles.barra} aria-hidden="true" />
          </div>
        ) : (
          <>
            <h1 className={styles.titulo}>Sistema anterior</h1>
            <p className={styles.bajada}>
              Tu cuenta trabaja en el sistema anterior del Colegio. Si no cargó, probá de nuevo en unos minutos.
            </p>

            {isError && (
              <p className={styles.error} role="alert">
                No pudimos preparar tu ingreso al sistema anterior.
              </p>
            )}

            {url && !isError ? (
              <a className={styles.principal} href={url} onClick={marcarSalto}>
                Abrir el sistema anterior
                <ArrowRight aria-hidden="true" />
              </a>
            ) : (
              <button
                type="button"
                className={styles.principal}
                onClick={() => void refetch()}
                disabled={isFetching}
                aria-busy={isFetching}
              >
                {isFetching ? "Preparando…" : "Reintentar"}
                {!isFetching && <RotateCw aria-hidden="true" />}
              </button>
            )}
          </>
        )}

        <div className={styles.secundarias}>
          <Link to="/" className={styles.secundaria}>
            <Home aria-hidden="true" />
            Volver al sitio
          </Link>
          <button type="button" className={styles.secundaria} onClick={() => void cerrarSesion()}>
            <LogOut aria-hidden="true" />
            Cerrar sesión
          </button>
        </div>
      </PantallaAcceso>
    </>
  );
}
