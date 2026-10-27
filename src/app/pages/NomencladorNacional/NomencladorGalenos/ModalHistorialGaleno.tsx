import { Modal } from "./ModalGalenos";
import styles from "./NomencladorGalenos.module.scss";
import Cargando from "@/app/components/ui/Cargando/Cargando";
import Tabla from "@/app/components/ui/Tabla/Tabla";
import { formatoPesos } from "@/app/shared/lib/formatos";
import { fmtUnidad, parseMonto } from "./galenos.helpers";
import type { GalenosCtx } from "./useGalenos";
import BotonPlano from "@/app/components/ui/BotonPlano/BotonPlano";

export default function ModalHistorialGaleno({ ctx, historialTarget }: { ctx: GalenosCtx; historialTarget: NonNullable<GalenosCtx["historialTarget"]> }) {
  const { setModalKind, historialRows, loadingHistorial } = ctx;
  return (
    <>
      <Modal
        title={`Historial — ${historialTarget.nombre}`}
        subtitle={[
          historialTarget.nivel != null
            ? `Nivel ${historialTarget.nivel}`
            : null,
          `OS ${historialTarget.os}`,
        ]
          .filter(Boolean)
          .join(" · ")}
        onClose={() => setModalKind(null)}
      >
        {loadingHistorial ? (
          <div className={styles.loadingRow}>
            <Cargando size={16} /> Cargando
            historial…
          </div>
        ) : historialRows.length === 0 ? (
          <p className={styles.hintText}>No hay registros históricos.</p>
        ) : (
          <div className={styles.historialTable}>
            <Tabla className={styles.table}>
              <thead>
                <tr>
                  <th>Desde</th>
                  <th>Hasta</th>
                  <th>Valor</th>
                  <th>Hon.</th>
                  <th>Ayu.</th>
                  <th>Gas.</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {historialRows.map((h) => (
                  <tr
                    key={h.id}
                    className={h.activo ? undefined : styles.rowInactive}
                  >
                    <td className={styles.metaCell}>{h.vigencia_desde}</td>
                    <td className={styles.metaCell}>
                      {h.vigencia_hasta ?? "—"}
                    </td>
                    <td className={styles.priceCell}>
                      {formatoPesos.format(parseMonto(h.valor_unitario) ?? 0)}
                    </td>
                    <td className={styles.unitCell}>
                      {fmtUnidad(h.unidades_honorarios)}
                    </td>
                    <td className={styles.unitCell}>
                      {fmtUnidad(h.unidades_ayudante)}
                    </td>
                    <td className={styles.unitCell}>
                      {fmtUnidad(h.unidades_gastos)}
                    </td>
                    <td>
                      {h.activo ? (
                        <span className={styles.badgeOk}>Activo</span>
                      ) : (
                        <span className={styles.badgeOff}>Cerrado</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </Tabla>
          </div>
        )}
        <div className={styles.modalFooter}>
          <BotonPlano
            className={styles.btnGhost}
            onClick={() => setModalKind(null)}
          >
            Cerrar
          </BotonPlano>
        </div>
      </Modal>
    </>
  );
}
