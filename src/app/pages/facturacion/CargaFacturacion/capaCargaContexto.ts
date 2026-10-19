import { createContext, useContext, type RefObject } from "react";

// Piezas compartidas de la capa de edición rápida (ver CapaCarga.tsx): la usan las
// rutas, el layout, el listado y el formulario.

/** Baja el código del formulario antes de que se pida (al entrar al listado). */
export const precargarFormularioCarga = () => { void import("./CargaFacturacion"); };

export const RUTA_EDICION = "/panel/facturacion/carga/:id";

/** Avisa al listado que una prestación se guardó: lo recarga y la resalta. */
export const EVENTO_PRESTACION_EDITADA = "facturacion:prestacion-editada";
export interface DetallePrestacionEditada { id: number }

export interface EstadoConFondo { fondo?: unknown }

// Lo que `RootRoutes` resolvió de la URL real (las rutas de abajo ven la del listado).
export interface RutaCapa { editId: string; from: string | null }
export const RutaCapaContext = createContext<RutaCapa | null>(null);

// Lo que ve el formulario cuando está dentro de la capa.
export interface CapaCargaCtx extends RutaCapa {
  /** Cierra la capa (vuelve al listado). Con id: se guardó esa prestación. */
  cerrar: (guardadaId?: number | null) => void;
  contenedor: RefObject<HTMLDivElement | null>;
}
export const CapaCargaContext = createContext<CapaCargaCtx | null>(null);
export const useCapaCarga = () => useContext(CapaCargaContext);
