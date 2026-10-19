import { useQuery } from "@tanstack/react-query";

import Tabla from "@/app/components/ui/Tabla/Tabla";
import { listarFacturas } from "@/app/pages/facturacion/api";
import { fmtFecha } from "@/app/pages/facturacion/utiles";
import { paginar } from "@/app/shared/lib/paginar";
import type { ColumnaExport } from "./exportar";
import { money, moneyExacto, numero } from "./reportes.types";
import { Cargando, ErrorBox, Vacio } from "./ReportesUI";
import styles from "./Reportes.module.scss";

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

type Props = { cierres: ReturnType<typeof useCierres> };

/** Facturado por obra social a medida que se cierra el período. */
export default function ReporteCierres({ cierres: { consulta, filas, abiertas } }: Props) {
  const total = filas.reduce((acc, c) => acc + c.importe, 0);

  return (
    <section className={styles.card}>
      <div className={styles.cardHead}>
        <h2 className={styles.cardTitle}>Obras sociales cerradas</h2>
      </div>

      {consulta.isLoading ? (
        <Cargando />
      ) : consulta.isError ? (
        <ErrorBox>No se pudo cargar el reporte.</ErrorBox>
      ) : (
        <>
          <dl className={styles.totales}>
            <div>
              <dt>Cerradas</dt>
              <dd>{numero.format(filas.length)}</dd>
            </div>
            <div>
              <dt>Abiertas</dt>
              <dd>{numero.format(abiertas)}</dd>
            </div>
            <div>
              <dt>Total del período</dt>
              <dd>{money.format(total)}</dd>
            </div>
          </dl>

          {filas.length === 0 ? (
            <Vacio>Todavía no se cerró ninguna obra social en este período.</Vacio>
          ) : (
            <div className={styles.tableWrap}>
              <Tabla className={styles.table}>
                <thead>
                  <tr>
                    <th>Obra social</th>
                    <th>Facturas</th>
                    <th>Último cierre</th>
                    <th>Facturado</th>
                  </tr>
                </thead>
                <tbody>
                  {filas.map((c) => (
                    <tr key={c.nro}>
                      <td className={styles.nombre}>{c.nombre}</td>
                      <td>{numero.format(c.facturas)}</td>
                      <td>{fmtFecha(c.ultimoCierre)}</td>
                      <td>{moneyExacto.format(c.importe)}</td>
                    </tr>
                  ))}
                  <tr>
                    <td colSpan={3}>Total general</td>
                    <td>{moneyExacto.format(total)}</td>
                  </tr>
                </tbody>
              </Tabla>
            </div>
          )}
        </>
      )}
    </section>
  );
}
