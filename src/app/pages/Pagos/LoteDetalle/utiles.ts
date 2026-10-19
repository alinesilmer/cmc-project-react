// Lo que comparten las pantallas de esta carpeta: una sola copia de cada cosa.

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

// Clase de Liquidacion.module.scss que pinta cada estado.
export const ESTADO_TONO: Record<string, "abierto" | "cerrado" | "enLiquidacion" | "aplicado"> = {
  A: "abierto",
  C: "cerrado",
  L: "enLiquidacion",
  AP: "aplicado",
};
