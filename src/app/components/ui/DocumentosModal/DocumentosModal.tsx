import { useState } from "react";
import type { ReactNode } from "react";

import Button from "@/app/components/ui/Button/Button";
import DocumentosUploader from "@/app/components/ui/DocumentosUploader/DocumentosUploader";
import type { DocumentoItem } from "@/app/components/ui/DocumentosUploader/DocumentosUploader";
import Modal from "@/app/components/ui/Modal/Modal";
import { abrirAdjunto } from "@/app/shared/lib/archivos";
import { mensajeDeError } from "@/app/shared/lib/httpErrors";

import styles from "./DocumentosModal.module.scss";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  titulo: string;
  /** Línea de contexto bajo el título (qué prestación es). */
  subtitulo?: ReactNode;
  documentos: DocumentoItem[];
  onAgregar: (archivos: File[]) => Promise<void>;
  onReemplazar: (doc: DocumentoItem, archivo: File) => Promise<void>;
  onEliminar: (doc: DocumentoItem) => Promise<void>;
  /** Sin esto no se ofrece cambiar el orden. */
  onMover?: (doc: DocumentoItem, delta: -1 | 1) => Promise<void>;
  /** Contenido debajo de la lista (por ejemplo el check de auditado). */
  pie?: ReactNode;
  /** Sólo ver los documentos (p. ej. período cerrado): sin agregar, reemplazar, eliminar ni ordenar. */
  soloLectura?: boolean;
}

/**
 * Los documentos de una prestación en un modal: ver, agregar, reemplazar, eliminar y ordenar.
 * Maneja el «ocupado» y el mensaje de error de cada acción; qué hace cada una lo define quien lo usa.
 */
export default function DocumentosModal({
  isOpen, onClose, titulo, subtitulo, documentos, onAgregar, onReemplazar, onEliminar, onMover, pie, soloLectura = false,
}: Props) {
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ejecutar = async (accion: () => Promise<void>, falla: string) => {
    setOcupado(true);
    setError(null);
    try {
      await accion();
    } catch (e) {
      setError(mensajeDeError(e, falla));
    } finally {
      setOcupado(false);
    }
  };

  const ver = (doc: DocumentoItem) =>
    abrirAdjunto(doc.url).catch((e: Error) => setError(e.message));

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={titulo} size="large">
      <div className={styles.cuerpo}>
        {subtitulo && <p className={styles.subtitulo}>{subtitulo}</p>}
        {soloLectura && (
          <p className={styles.ayuda}>El período está cerrado: la documentación se puede ver, pero ya no modificar.</p>
        )}
        {onMover && !soloLectura && documentos.length > 1 && (
          <p className={styles.ayuda}>Con las flechas cambiás el orden en el que salen en el PDF de la factura.</p>
        )}
        <DocumentosUploader
          items={documentos}
          ocupado={ocupado}
          error={error}
          onVer={ver}
          soloLectura={soloLectura}
          onAgregar={(a) => ejecutar(() => onAgregar(a), "No pudimos subir los archivos.")}
          onReemplazar={(d, a) => ejecutar(() => onReemplazar(d, a), "No pudimos reemplazar el archivo.")}
          onEliminar={(d) => ejecutar(() => onEliminar(d), "No pudimos eliminar el archivo.")}
          onMover={onMover && ((d, delta) => ejecutar(() => onMover(d, delta), "No pudimos cambiar el orden."))}
        />
        {pie}
        <div className={styles.pie}>
          <Button variant="primary" onClick={onClose} disabled={ocupado}>Listo</Button>
        </div>
      </div>
    </Modal>
  );
}
