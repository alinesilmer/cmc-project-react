import { Plus } from "lucide-react";
import Button from "@/app/components/ui/Button/Button";
import Tabla from "@/app/components/ui/Tabla/Tabla";
import { abrirAdjunto } from "@/app/shared/lib/archivos";
import { useNotify } from "@/app/hooks/useNotify";
import styles from "../DoctorProfilePage.module.scss";
import type { LegajoEspecialidades } from "./useLegajoEspecialidades";

type Props = { readOnly: boolean; especialidades: LegajoEspecialidades };

export default function TabEspecialidades({ readOnly, especialidades }: Props) {
  const notify = useNotify();
  const { especs, espLoading, setAssocEspOpen, setAssocEspId, setAssocEspResol, setAssocEspDate, setAssocEspFile, setDelEspOpen, setEspToDelete } = especialidades;

  return (
    <>
        <div className={styles.conceptsHeader}>
          <h5 className={styles.section}>
            Especialidades adheridas
          </h5>
          {!readOnly && (
          <Button
            variant="primary"
            onClick={() => {
              setAssocEspOpen(true);
              setAssocEspId("");
              setAssocEspResol("");
              setAssocEspDate(null);
              setAssocEspFile(null);
            }}
          >
            <Plus size={16} />
            &nbsp;Agregar especialidad
          </Button>
          )}
        </div>

        {espLoading && (
          <p className={styles.muted}>
            Cargando especialidades…
          </p>
        )}

        {!espLoading && (
          <div className={styles.tableWrap}>
            <Tabla className={styles.table}>
              <thead>
                <tr>
                  <th>ID colegio</th>
                  <th>Especialidad</th>
                  <th>N° resolución</th>
                  <th>Fecha resolución</th>
                  <th>Adjunto</th>
                  {!readOnly && <th style={{ width: 120 }}>Acciones</th>}
                </tr>
              </thead>
              <tbody>
                {(especs || []).length === 0 ? (
                  <tr>
                    <td
                      colSpan={readOnly ? 5 : 6}
                      className={styles.mutedCenter}
                    >
                      Sin especialidades asociadas.
                    </td>
                  </tr>
                ) : (
                  especs.map((r) => {
                    return (
                      <tr key={r.id}>
                        <td>{r.id}</td>
                        <td>{r.nombre ?? `ID ${r.id}`}</td>
                        <td>{r.n_resolucion ?? "—"}</td>
                        <td>
                          {r.fecha_resolucion
                            ? new Date(
                                r.fecha_resolucion
                              ).toLocaleDateString("es-AR")
                            : "—"}
                        </td>
                        <td>
                          {r.adjunto_url ? (
                            <Button
                              size="sm"
                              variant="primary"
                              onClick={() => {
                                if (r.adjunto_url)
                                  abrirAdjunto(r.adjunto_url).catch((e) =>
                                    notify.error(e.message)
                                  );
                              }}
                              title="Abrir adjunto"
                              style={{ padding: "4px 8px" }}
                            >
                              Ver adjunto
                            </Button>
                          ) : (
                            "—"
                          )}
                        </td>
                        {!readOnly && (
                        <td>
                          <Button
                            size="sm"
                            variant="danger"
                            onClick={() => {
                              setEspToDelete(r);
                              setDelEspOpen(true);
                            }}
                          >
                            Quitar
                          </Button>
                        </td>
                        )}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </Tabla>
          </div>
        )}
    </>
  );
}
