import type { UseQueryResult } from "@tanstack/react-query";

import Tabla from "@/app/components/ui/Tabla/Tabla";
import type { Especialidad } from "@/app/pages/Especialidades/especialidades.types";
import type { CodigoStat } from "./reportes.types";
import { money, moneyExacto, numero } from "./reportes.types";
import { Cargando, ErrorBox, Vacio } from "./ReportesUI";
import styles from "./Reportes.module.scss";
import BotonPlano from "@/app/components/ui/BotonPlano/BotonPlano";

type Props = {
  especialidades: Especialidad[];
  /** `ID_COLEGIO_ESPE` de la elegida; `null` mientras no se eligió ninguna. */
  especialidadId: number | null;
  onEspecialidad: (id: number | null) => void;
  consulta: UseQueryResult<CodigoStat[]>;
  /** Baja al detalle de un código, como en la solapa «Códigos». */
  onCodigo: (codigo: string) => void;
};

/** Qué se facturó de una especialidad en el período: sus códigos, de mayor a menor. */
export default function ReporteEspecialidad({
  especialidades,
  especialidadId,
  onEspecialidad,
  consulta,
  onCodigo,
}: Props) {
  const filas = consulta.data ?? [];
  const total = filas.reduce((acc, c) => acc + c.importe_total, 0);
  const prestaciones = filas.reduce((acc, c) => acc + c.prestaciones, 0);

  return (
    <section className={styles.card}>
      <div className={styles.cardHead}>
        <h2 className={styles.cardTitle}>Especialidad</h2>
        <div className={styles.controls}>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="especialidad">
              Especialidad
            </label>
            <select
              id="especialidad"
              className={styles.select}
              value={especialidadId ?? ""}
              onChange={(e) => onEspecialidad(e.target.value ? Number(e.target.value) : null)}
            >
              <option value="">Elegí una</option>
              {especialidades.map((e) => (
                <option key={e.id} value={e.id_colegio_espe}>
                  {e.nombre}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {especialidadId === null ? (
        <Vacio>Elegí una especialidad</Vacio>
      ) : consulta.isLoading ? (
        <Cargando />
      ) : consulta.isError ? (
        <ErrorBox>No se pudo cargar el reporte.</ErrorBox>
      ) : filas.length === 0 ? (
        <Vacio>Sin facturación en este período.</Vacio>
      ) : (
        <>
          <dl className={styles.totales}>
            <div>
              <dt>Códigos</dt>
              <dd>{numero.format(filas.length)}</dd>
            </div>
            <div>
              <dt>Prestaciones</dt>
              <dd>{numero.format(prestaciones)}</dd>
            </div>
            <div>
              <dt>Facturado</dt>
              <dd>{money.format(total)}</dd>
            </div>
          </dl>

          <div className={styles.tableWrap}>
            <Tabla className={styles.table}>
              <thead>
                <tr>
                  <th>Código</th>
                  <th>Descripción</th>
                  <th>Cant.</th>
                  <th>Prest.</th>
                  <th>Médicos</th>
                  <th>Facturado</th>
                </tr>
              </thead>
              <tbody>
                {filas.map((c) => (
                  <tr key={c.codigo}>
                    <td>
                      <BotonPlano type="button" className={styles.rowBtn} onClick={() => onCodigo(c.codigo)}>
                        {c.codigo}
                      </BotonPlano>
                    </td>
                    <td className={styles.nombre}>{c.descripcion ?? "—"}</td>
                    <td>{numero.format(c.cantidad)}</td>
                    <td>{numero.format(c.prestaciones)}</td>
                    <td>{numero.format(c.medicos)}</td>
                    <td>{moneyExacto.format(c.importe_total)}</td>
                  </tr>
                ))}
              </tbody>
            </Tabla>
          </div>
        </>
      )}
    </section>
  );
}
