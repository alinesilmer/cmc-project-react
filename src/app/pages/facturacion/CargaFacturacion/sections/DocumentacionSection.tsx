import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, FileText, Paperclip } from "lucide-react";

import DocumentosModal from "@/app/components/ui/DocumentosModal/DocumentosModal";
import DocumentosUploader from "@/app/components/ui/DocumentosUploader/DocumentosUploader";
import type { DocumentoItem } from "@/app/components/ui/DocumentosUploader/DocumentosUploader";
import {
  agregarDocumentosPrestacion,
  eliminarDocumentoPrestacion,
  listarDocumentosPrestacion,
  reemplazarDocumentoPrestacion,
  reordenarDocumentosPrestacion,
} from "../../api";
import type { DocumentoPrestacion } from "../../types";
import comun from "../Comun.module.scss";;

interface Props {
  /** El código elegido exige documentación digital en esta obra social. */
  requiere: boolean;
  /** Alta: los archivos se guardan junto con la prestación. Edición: se gestionan en el momento, ya guardados. */
  prestacionId?: number | null;
  /** Alta: archivos elegidos, que se suben al guardar. */
  archivos: File[];
  onArchivosChange: (archivos: File[]) => void;
  disabled?: boolean;
  /** Para describir la prestación en el panel (código y paciente). */
  subtitulo?: React.ReactNode;
}

const aItem = (d: DocumentoPrestacion): DocumentoItem => ({
  id: d.id, nombre: d.nombre, tamano: d.size, contentType: d.content_type, origen: d.origen, url: d.url,
});

const verLocal = (item: DocumentoItem) => {
  if (!item.archivo) return;
  const url = URL.createObjectURL(item.archivo);
  window.open(url, "_blank", "noopener,noreferrer");
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
};

/**
 * Documentación digital de la prestación, desde el Colegio.
 *
 * Al cargar, los archivos son opcionales: si no se adjuntan, la prestación queda «Falta documentación» y se
 * completa después. Al editar, un botón (justo después del código) abre el panel donde se agregan, ven,
 * reemplazan, eliminan y ordenan; es el único lugar donde el Colegio edita documentos.
 */
export default function DocumentacionSection({
  requiere, prestacionId, archivos, onArchivosChange, disabled = false, subtitulo,
}: Props) {
  const edicion = prestacionId != null;
  const [docs, setDocs] = useState<DocumentoPrestacion[]>([]);
  const [abierto, setAbierto] = useState(false);

  const cargar = useCallback(async () => {
    if (prestacionId == null) return;
    try {
      setDocs(await listarDocumentosPrestacion(prestacionId));
    } catch {
      setDocs([]);
    }
  }, [prestacionId]);

  useEffect(() => { void cargar(); }, [cargar]);

  // Sin que el código exija nada y sin archivos ya cargados, no hay nada que mostrar.
  if (!requiere && docs.length === 0 && archivos.length === 0) return null;

  if (!edicion) {
    const items: DocumentoItem[] = archivos.map((f, i) => ({
      id: `${i}-${f.name}-${f.size}`, nombre: f.name, tamano: f.size, contentType: f.type, archivo: f,
    }));
    return (
      <div className={comun.section}>
        <span className={comun.sectionTitle}>Documentación digital</span>
        <DocumentosUploader
          items={items}
          ocupado={disabled}
          onVer={verLocal}
          onAgregar={(nuevos) => onArchivosChange([...archivos, ...nuevos])}
          onReemplazar={(item, archivo) => onArchivosChange(archivos.map((f) => (f === item.archivo ? archivo : f)))}
          onEliminar={(item) => onArchivosChange(archivos.filter((f) => f !== item.archivo))}
        />
        <div className={comun.warningBox} style={{ textAlign: "left", display: "flex", alignItems: "center", gap: 8 }}>
          <AlertTriangle size={14} style={{ flexShrink: 0 }} />
          <span>
            Desde el Colegio no es obligatorio en la carga: si no adjuntás ahora, la prestación queda como{" "}
            <strong>«Falta documentación»</strong> y se completa después desde la edición de la prestación.
          </span>
        </div>
      </div>
    );
  }

  const faltan = requiere && docs.length === 0;
  return (
    <div className={comun.section}>
      <span className={comun.sectionTitle}>Documentación digital</span>
      <div>
        <button
          type="button"
          className={comun.btnGhost}
          onClick={() => setAbierto(true)}
          disabled={disabled}
          style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
        >
          {docs.length > 0 ? <FileText size={15} aria-hidden="true" /> : <Paperclip size={15} aria-hidden="true" />}
          {faltan ? "Documentación: falta" : `Documentación (${docs.length})`}
        </button>
      </div>
      {abierto && (
        <DocumentosModal
          isOpen
          onClose={() => setAbierto(false)}
          titulo="Documentación"
          subtitulo={subtitulo}
          documentos={docs.map(aItem)}
          onAgregar={async (nuevos) => setDocs(await agregarDocumentosPrestacion(prestacionId, nuevos))}
          onReemplazar={async (doc, archivo) =>
            setDocs(await reemplazarDocumentoPrestacion(prestacionId, Number(doc.id), archivo))}
          onEliminar={async (doc) => setDocs(await eliminarDocumentoPrestacion(prestacionId, Number(doc.id)))}
          onMover={async (doc, delta) => {
            const ids = docs.map((d) => d.id);
            const i = ids.indexOf(Number(doc.id));
            const j = i + delta;
            if (i < 0 || j < 0 || j >= ids.length) return;
            [ids[i], ids[j]] = [ids[j], ids[i]];
            setDocs(await reordenarDocumentosPrestacion(prestacionId, ids));
          }}
        />
      )}
    </div>
  );
}
