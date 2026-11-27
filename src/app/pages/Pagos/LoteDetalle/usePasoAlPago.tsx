import { useState } from "react";
import { aNumeroPorcentaje } from "../types";
import PorcentajeDeLotes, { type PasoElegido } from "./PorcentajeDeLotes";

/**
 * Lo que necesita la acción «Pasar al pago» de una lista de lotes (`SelectableTable`) para pedir el % de pago en la
 * confirmación, igual que el detalle del lote: se esparce dentro de la definición de la acción.
 */
export function usePasoAlPago<T extends { id: number }>() {
  const [paso, setPaso] = useState<PasoElegido>({ valor: "", listo: false });
  return {
    // Sin % (campo vacío) cada ítem entra al pago con el suyo.
    payload: () => ({ estado: "L", porcentaje_pago: paso.valor.trim() ? aNumeroPorcentaje(paso.valor) : undefined }),
    confirmContent: (rows: T[]) => <PorcentajeDeLotes ids={rows.map((r) => r.id)} onChange={setPaso} />,
    confirmDisabled: !paso.listo,
  };
}
