import { useEffect } from "react";
import { Building2, RefreshCw } from "lucide-react";

import styles from "./NomencladorPorOS.module.scss";
import { useNomencladorPorOS } from "./useNomencladorPorOS";
import PorOSPanelObrasSociales from "./PorOSPanelObrasSociales";
import PorOSContenido from "./PorOSContenido";
import ModalCrearCabecera from "./ModalCrearCabecera";
import ModalCrearCodigo from "./ModalCrearCodigo";
import ModalCrearDescripcion from "./ModalCrearDescripcion";
import ModalCrearClasificacion from "./ModalCrearClasificacion";
import ModalCrearPrecio from "./ModalCrearPrecio";
import ModalCrearPie from "./ModalCrearPie";
import ModalEditarCabecera from "./ModalEditarCabecera";
import ModalEditarNucleo from "./ModalEditarNucleo";
import ModalEditarValores from "./ModalEditarValores";
import ModalEditarVariante from "./ModalEditarVariante";
import ModalEditarPie from "./ModalEditarPie";
import { parseMonto } from "../nomenclador.helpers";
import PaginaPasos from "@/app/components/layout/PaginaPasos/PaginaPasos";
import Button from "@/app/components/ui/Button/Button";
import ConfirmModal from "@/app/components/ui/ConfirmModal/ConfirmModal";
import Dialogo from "@/app/components/ui/Dialogo/Dialogo";
import MarcoModal from "@/app/components/ui/MarcoModal/MarcoModal";
import Tabla from "@/app/components/ui/Tabla/Tabla";
import { useNotify } from "@/app/hooks/useNotify";
import { formatoPesos } from "@/app/shared/lib/formatos";

/** Valores por obra social: se elige la obra social y se ven, cargan, editan y cierran sus precios. */
export default function NomencladorPorOS() {
  const ctx = useNomencladorPorOS();
  const notify = useNotify();
  const { modalKind, editTarget, revalorizar, setRevalorizar, revalorizando, editMode, toast, deleteTarget, setDeleteTarget, confirmarRevalorizar, doDelete } = ctx;

  // El hook avisa con su propio `toast`: se pasa a los avisos del panel, que son los de todas las pantallas.
  useEffect(() => {
    if (!toast) return;
    if (toast.type === "success") notify.success(toast.msg);
    else notify.error(toast.msg);
  }, [toast, notify]);

  const porRevalorizar = revalorizar?.items.filter((i) => i.estado === "revalorizada").length ?? 0;

  return (
    <PaginaPasos titulo="Valores por obra social" icono={Building2} ancha>
      <PorOSPanelObrasSociales ctx={ctx} />
      <PorOSContenido ctx={ctx} />

      {modalKind === "create" && (
        <MarcoModal className={`${styles.modal} ${styles.modalXl}`}>
          <ModalCrearCabecera ctx={ctx} />
          <div className={styles.modalBody}>
            <ModalCrearCodigo ctx={ctx} />
            <ModalCrearDescripcion ctx={ctx} />
            <ModalCrearClasificacion ctx={ctx} />
            <ModalCrearPrecio ctx={ctx} />
          </div>
          <ModalCrearPie ctx={ctx} />
        </MarcoModal>
      )}

      {modalKind === "edit" && editTarget && (
        <MarcoModal className={`${styles.modal} ${editMode === "nucleo" ? styles.modalXl : styles.modalLg}`}>
          <ModalEditarCabecera ctx={ctx} editTarget={editTarget} />
          <div className={styles.modalBody}>
            <ModalEditarNucleo ctx={ctx} editTarget={editTarget} />
            <ModalEditarValores ctx={ctx} editTarget={editTarget} />
            <ModalEditarVariante ctx={ctx} editTarget={editTarget} />
          </div>
          <ModalEditarPie ctx={ctx} />
        </MarcoModal>
      )}

      {revalorizar && (
        <Dialogo
          titulo="Actualizar prestaciones con el precio nuevo"
          icono={RefreshCw}
          ancho="grande"
          onClose={revalorizando ? undefined : () => setRevalorizar(null)}
          acciones={
            <>
              <Button variant="ghost" onClick={() => setRevalorizar(null)} disabled={revalorizando}>
                Ahora no
              </Button>
              <Button onClick={confirmarRevalorizar} isLoading={revalorizando} disabled={porRevalorizar === 0}>
                Revalorizar {porRevalorizar}
              </Button>
            </>
          }
        >
          <p className={styles.revalorizarTexto}>
            Hay <strong>{revalorizar.revalorizadas} prestación{revalorizar.revalorizadas === 1 ? "" : "es"} abierta{revalorizar.revalorizadas === 1 ? "" : "s"}</strong>{" "}
            del código {revalorizar.codigo} cuyo importe cambia con el precio nuevo (en $0 o con un precio anterior)
            {revalorizar.sin_cambios > 0 && `; otras ${revalorizar.sin_cambios} ya tienen este precio`}. Las manuales y las de períodos
            cerrados no se tocan.
          </p>
          <div className={styles.revalorizarTabla}>
            <Tabla>
              <thead>
                <tr>
                  <th>Período</th>
                  <th>Médico</th>
                  <th>Fecha</th>
                  <th>Antes</th>
                  <th>Después</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {revalorizar.items.map((it) => (
                  <tr key={it.id}>
                    <td>{it.periodo}</td>
                    <td>Socio {it.cod_med}</td>
                    <td>{it.fecha_practica ?? "—"}</td>
                    <td>{formatoPesos.format(parseMonto(it.importe_antes))}</td>
                    <td>{it.estado === "revalorizada" ? formatoPesos.format(parseMonto(it.importe_despues)) : "—"}</td>
                    <td>{it.estado !== "revalorizada" && it.motivo}</td>
                  </tr>
                ))}
              </tbody>
            </Tabla>
          </div>
        </Dialogo>
      )}

      <ConfirmModal
        isOpen={deleteTarget !== null}
        variant="danger"
        title="Cerrar valor"
        message={`¿Cerrar el valor del código ${deleteTarget?.codigo} para esta obra social? Esta acción no se puede deshacer.`}
        confirmLabel="Cerrar valor"
        onConfirm={doDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </PaginaPasos>
  );
}
