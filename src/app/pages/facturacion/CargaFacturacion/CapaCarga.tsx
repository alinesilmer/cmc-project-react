import { lazy, Suspense, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { usePermisos } from "@/app/auth/usePermisos";
import {
  CapaCargaContext, EVENTO_PRESTACION_EDITADA, RutaCapaContext,
  type DetallePrestacionEditada, type RutaCapa,
} from "./capaCargaContexto";
import styles from "./CapaCarga.module.scss";

// Edición rápida desde el listado de una factura: el formulario de carga se abre como
// una capa a pantalla completa ENCIMA del listado, que sigue montado debajo. La URL es
// la de siempre (`/panel/facturacion/carga/:id?from=…`); lo que marca que va encima es
// `state.fondo` (la ubicación del listado), con el patrón de "rutas modales" de React
// Router: `RootRoutes` dibuja las rutas con `fondo` y esta capa con la ubicación real.
// Si se abre la URL sola (otra pestaña, link copiado) no hay `fondo` y se ve la página
// de carga completa, como antes.

const CargaFacturacion = lazy(() => import("./CargaFacturacion"));

const DURACION_S = 0.2;

/** Va en el layout del panel: dibuja la capa cuando la URL real es una edición con fondo. */
export function CapaCarga() {
  const ruta = useContext(RutaCapaContext);
  const { can } = usePermisos();
  if (!ruta || !can("facturacion:cargar")) return null;
  return <Capa ruta={ruta} />;
}

function Capa({ ruta }: { ruta: RutaCapa }) {
  const navigate = useNavigate();
  const contenedor = useRef<HTMLDivElement>(null);
  const [saliendo, setSaliendo] = useState(false);
  const volvio = useRef(false);
  const volver = useCallback(() => {
    if (volvio.current) return;
    volvio.current = true;
    navigate(-1);
  }, [navigate]);

  // Respaldo: si la animación no llega a terminar (pestaña en segundo plano, sin
  // cuadros) igual se vuelve al listado.
  useEffect(() => {
    if (!saliendo) return;
    const t = window.setTimeout(volver, DURACION_S * 1000 + 150);
    return () => window.clearTimeout(t);
  }, [saliendo, volver]);

  // Antes de pintar: si no, se llega a ver un cuadro con la página de atrás corrida.
  useLayoutEffect(() => {
    const html = document.documentElement;
    const barra = window.innerWidth - html.clientWidth;
    const paddingAntes = html.style.paddingRight;
    html.classList.add("capa-carga-abierta");
    if (barra > 0) html.style.paddingRight = `${barra}px`;
    return () => {
      html.classList.remove("capa-carga-abierta");
      html.style.paddingRight = paddingAntes;
    };
  }, []);

  const cerrar = useCallback((guardadaId?: number | null) => {
    if (guardadaId != null) {
      window.dispatchEvent(new CustomEvent<DetallePrestacionEditada>(
        EVENTO_PRESTACION_EDITADA, { detail: { id: guardadaId } },
      ));
    }
    setSaliendo(true);
  }, []);

  const valor = useMemo(() => ({ ...ruta, cerrar, contenedor }), [ruta, cerrar]);

  return (
    <CapaCargaContext.Provider value={valor}>
      <motion.div
        ref={contenedor}
        className={styles.capa}
        initial={{ opacity: 0, y: 28 }}
        animate={saliendo ? { opacity: 0, y: 20 } : { opacity: 1, y: 0 }}
        transition={{ duration: DURACION_S, ease: [0.2, 0, 0, 1] }}
        // Se vuelve atrás (al listado) recién cuando terminó de irse.
        onAnimationComplete={() => { if (saliendo) volver(); }}
      >
        <Suspense fallback={<p className={styles.cargando}>Cargando formulario…</p>}>
          {/* key: otra prestación es otro formulario, sin arrastrar estado */}
          <CargaFacturacion key={ruta.editId} />
        </Suspense>
      </motion.div>
    </CapaCargaContext.Provider>
  );
}
