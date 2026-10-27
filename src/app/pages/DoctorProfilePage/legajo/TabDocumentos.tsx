import { Plus } from "lucide-react";
import Button from "@/app/components/ui/Button/Button";
import { abrirAdjunto } from "@/app/shared/lib/archivos";
import { usePermisos } from "@/app/auth/usePermisos";
import { useNotify } from "@/app/hooks/useNotify";
import styles from "../DoctorProfilePage.module.scss";
import { prettyFromAnyLabel } from "./legajo.helpers";
import type { LegajoDocumentos } from "./useLegajoDocumentos";

type Props = { readOnly: boolean; documentos: LegajoDocumentos };

export default function TabDocumentos({ readOnly, documentos }: Props) {
  const { can } = usePermisos();
  const notify = useNotify();
  const { docs, docsLoading, setDocOpen, setDocLabel, setDocCustom, setDocFile, labelOptions, askDeleteDoc } = documentos;

  return (
    <>
        <div className={styles.docsHeaderInline}>
          <h5 className={styles.section}>Documentación</h5>
          <div className={styles.docActionsRight}>
            {!readOnly && can("medico:documento") && (
            <Button
              variant="ghost"
              onClick={() => {
                setDocFile(null);
                setDocCustom("");
                setDocLabel(labelOptions[0] || "attach_titulo");
                setDocOpen(true);
              }}
            >
              <Plus size={16} />
              &nbsp;Agregar documento
            </Button>
            )}
          </div>
        </div>

        {docsLoading ? (
          <p className={styles.muted}>Cargando…</p>
        ) : docs.length === 0 ? (
          <p className={styles.muted}>No hay documentos.</p>
        ) : (
          <ul className={styles.docList}>
            {docs.map((doc) => (
              <li key={doc.id} className={styles.docItem}>
                <div>
                  <p className={styles.docLabel}>
                    {prettyFromAnyLabel(doc.label)}
                  </p>
                  <p className={styles.docName}>
                    {doc.file_name}
                  </p>
                </div>
                <div className={styles.docActions}>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() =>
                      abrirAdjunto(doc.url).catch((e) =>
                        notify.error(e.message)
                      )
                    }
                  >
                    Descargar
                  </Button>
                  {!readOnly && can("medico:documento") && (
                  <Button
                    variant="ghost"
                    size="sm"
                    style={{ marginLeft: 8 }}
                    onClick={() => askDeleteDoc(doc)}
                  >
                    Eliminar
                  </Button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
    </>
  );
}
