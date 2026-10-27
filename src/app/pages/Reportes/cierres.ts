import { useQuery } from "@tanstack/react-query";

import { listarFacturas } from "@/app/pages/facturacion/api";
import { fmtFecha } from "@/app/pages/facturacion/utiles";
import { paginar } from "@/app/shared/lib/paginar";
import type { ColumnaExport } from "./exportar";

/** Los mismos que `FACTURA_ESTADOS_CERRADOS` del backend. */
const CERRADOS = new Set(["C", "L", "LC"]);
const PASO = 200;

export interface CierreObraSocial {
  nro: string;
  nombre: string;
  /** Original más complementos cerrados. */
  facturas: number;
  importe: number;
  /** Último cierre, `YYYY-MM-DD…`. */
  ultimoCierre: string | null;
}

export const colsCierres: ColumnaExport<CierreObraSocial>[] = [
  { header: "Nº", value: (c) => c.nro },
  { header: "Obra social", value: (c) => c.nombre },
  { header: "Facturas", value: (c) => c.facturas, tipo: "numero" },
  { header: "Último cierre", value: (c) => fmtFecha(c.ultimoCierre) },
  { header: "Facturado", value: (c) => c.importe, tipo: "moneda" },
];

/** Lo cerrado de un período, por obra social, y cuántas siguen abiertas. */
export function useCierres(
  periodo: string,
  obraSocial: string,
  nombreDe: (nro: string) => string,
  habilitado: boolean,
) {
  const consulta = useQuery({
    queryKey: ["rep-cierres", periodo],
    queryFn: () =>
      paginar(
        (page) =>
          listarFacturas({ periodo, limit: PASO, offset: (page - 1) * PASO }).then((r) => r.data),
        { size: PASO },
      ),
    enabled: habilitado,
    retry: 1,
  });

  const porObra = new Map<string, CierreObraSocial>();
  const abiertas = new Set<string>();
  for (const f of consulta.data ?? []) {
    if (obraSocial && f.cod_obr !== obraSocial) continue;
    if (!f.estado || !CERRADOS.has(f.estado)) {
      abiertas.add(f.cod_obr);
      continue;
    }
    const fila = porObra.get(f.cod_obr) ?? {
      nro: f.cod_obr,
      nombre: nombreDe(f.cod_obr),
      facturas: 0,
      importe: 0,
      ultimoCierre: null,
    };
    fila.facturas += 1;
    // Decimal del backend: llega como texto.
    fila.importe += Number(f.importe ?? 0);
    if (f.fecha && (!fila.ultimoCierre || f.fecha > fila.ultimoCierre)) fila.ultimoCierre = f.fecha;
    porObra.set(f.cod_obr, fila);
  }
  // Una obra social con el original cerrado y un complemento abierto cuenta como cerrada.
  for (const nro of porObra.keys()) abiertas.delete(nro);

  const filas = [...porObra.values()].sort((a, b) => b.importe - a.importe);
  return { consulta, filas, abiertas: abiertas.size };
}
