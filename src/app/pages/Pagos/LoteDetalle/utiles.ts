// Lo que comparten las pantallas de esta carpeta: una sola copia de cada cosa.
import { detalleObjeto } from "@/app/shared/lib/httpErrors";
import type { Ajuste, LoteAjuste } from "../types";

/** La leyenda con que la API avisa que el débito supera el importe de la prestación (se puede cargar igual,
 *  reenviando con `confirmar_exceso`). `null` si el error es otro. */
export const avisoDeExceso = (e: unknown): string | null => {
  const d = detalleObjeto(e);
  return d?.codigo === "debito_supera_importe" ? (d.mensaje ?? null) : null;
};

export const LOTE_URL = (id: string | number) => `/api/lotes/snaps/${id}`;

export const ITEMS_URL = (id: string | number) => `/api/lotes/snaps/${id}/items`;

export const ITEM_URL = (loteId: string | number, ajusteId: number) =>
  `/api/lotes/snaps/${loteId}/items/${ajusteId}`;

export const ESTADO_URL = (id: string | number) => `/api/lotes/snaps/${id}/estado`;

export const estadoLabel = (e: string) => {
  if (e === "A") return "Abierto";
  if (e === "C") return "Cerrado";
  if (e === "L") return "En Liquidaciones";
  if (e === "AP") return "Aplicado";
  return e;
};

// ── Cambios locales del lote ──────────────────────────────────────
// Al agregar, editar o quitar un ajuste la API ya contesta con lo que cambió: la pantalla actualiza sólo esa fila
// (y los totales del lote, que son la suma de sus ajustes) en vez de volver a pedir y repintar todo el lote.

const centavos = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

/** El lote con la lista de ajustes dada y sus totales de débitos y créditos recalculados (honorarios + gastos). */
export const conAjustes = (lote: LoteAjuste, ajustes: Ajuste[]): LoteAjuste => {
  let debitos = 0;
  let creditos = 0;
  for (const a of ajustes) {
    const total = Number(a.honorarios) + Number(a.gastos);
    if (a.tipo === "d") debitos += total;
    else creditos += total;
  }
  return { ...lote, ajustes, total_debitos: centavos(debitos).toFixed(2), total_creditos: centavos(creditos).toFixed(2) };
};

/** Suma `nuevo` al final de los ajustes del lote. */
export const conAjusteAgregado = (lote: LoteAjuste, nuevo: Ajuste): LoteAjuste =>
  conAjustes(lote, [...lote.ajustes.filter((a) => a.id !== nuevo.id), nuevo]);

/** Cambia por `editado` el ajuste del mismo id, sin mover las demás filas. */
export const conAjusteReemplazado = (lote: LoteAjuste, editado: Ajuste): LoteAjuste =>
  conAjustes(lote, lote.ajustes.map((a) => (a.id === editado.id ? { ...a, ...editado } : a)));

/** Saca del lote los ajustes con esos ids. */
export const sinAjustes = (lote: LoteAjuste, ids: Iterable<number | string>): LoteAjuste => {
  const quitar = new Set(Array.from(ids, Number));
  return conAjustes(lote, lote.ajustes.filter((a) => !quitar.has(a.id)));
};

// ── % de pago al pasar el lote al pago ────────────────────────────

/** El % que tienen todos los ítems del lote; `null` si tienen distintos. Un ítem sin % cuenta como 100. */
export const porcentajeComun = (ajustes: Ajuste[]): number | null => {
  const distintos = new Set(ajustes.map((a) => Number(a.porcentaje_pago ?? 100)));
  if (distintos.size > 1) return null;
  return distintos.size === 1 ? [...distintos][0] : 100;
};

/** Lo que entra al pago: cada importe cargado por `porcentaje` (o por el de su ítem si es `null`),
 *  redondeado al centavo por separado, como lo hace la API. */
export const totalesAlPasar = (ajustes: Ajuste[], porcentaje: number | null) => {
  let debitos = 0;
  let creditos = 0;
  for (const a of ajustes) {
    const p = porcentaje ?? Number(a.porcentaje_pago ?? 100);
    const total = centavos((Number(a.honorarios) * p) / 100) + centavos((Number(a.gastos) * p) / 100);
    if (a.tipo === "d") debitos += total;
    else creditos += total;
  }
  return { debitos: centavos(debitos), creditos: centavos(creditos) };
};

// Clase de Liquidacion.module.scss que pinta cada estado.
export const ESTADO_TONO: Record<string, "abierto" | "cerrado" | "enLiquidacion" | "aplicado"> = {
  A: "abierto",
  C: "cerrado",
  L: "enLiquidacion",
  AP: "aplicado",
};
