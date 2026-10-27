import Tabla from "@/app/components/ui/Tabla/Tabla";
import { fmtFecha } from "@/app/pages/facturacion/utiles";
import type { useCierres } from "./cierres";
import { money, moneyExacto, numero } from "./reportes.types";
import { Cargando, ErrorBox, Vacio } from "./ReportesUI";
import styles from "./Reportes.module.scss";

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
