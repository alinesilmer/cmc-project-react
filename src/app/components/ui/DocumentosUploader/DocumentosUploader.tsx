import { useId, useRef, useState } from "react";
import { ArrowDown, ArrowUp, Eye, FileUp, RefreshCw, Trash2 } from "lucide-react";

import styles from "./DocumentosUploader.module.scss";
import BotonPlano from "@/app/components/ui/BotonPlano/BotonPlano";

/** Un archivo de la documentación: ya subido (con `url`) o todavía local (con `archivo`). */
export interface DocumentoItem {
  id: number | string;
  nombre: string;
  tamano?: number;
  contentType?: string;
  origen?: "medico" | "colegio";
  /** Ruta de la API: pide token, se abre con `abrirAdjunto()`. */
  url?: string | null;
  /** Archivo aún no enviado (formulario de carga): se abre desde la memoria del navegador. */
  archivo?: File;
}

interface Props {
  items: DocumentoItem[];
  /** Agrega archivos. Recibe sólo los que pasaron la validación de formato y tamaño. */
  onAgregar: (archivos: File[]) => void | Promise<void>;
  onReemplazar?: (item: DocumentoItem, archivo: File) => void | Promise<void>;
  onEliminar?: (item: DocumentoItem) => void | Promise<void>;
  /** Sube (-1) o baja (+1) un documento en el orden en que salen en el PDF. */
  onMover?: (item: DocumentoItem, delta: -1 | 1) => void | Promise<void>;
  onVer: (item: DocumentoItem) => void | Promise<void>;
  /** Ocupado (subiendo o guardando): bloquea las acciones. */
  ocupado?: boolean;
  /** Error de afuera (por ejemplo el que devolvió el servidor). */
  error?: string | null;
  /** Texto de la zona de arrastre cuando ya hay archivos. */
  textoAgregar?: string;
  /** Sólo se pueden ver: sin agregar, reemplazar, eliminar ni reordenar (p. ej. período cerrado). */
  soloLectura?: boolean;
}

const MAX_MB = 5;
const MAX_BYTES = MAX_MB * 1024 * 1024;
const EXTENSIONES = [".pdf", ".jpg", ".jpeg", ".png"];

function validar(archivo: File): string | null {
  const nombre = archivo.name.toLowerCase();
  if (!EXTENSIONES.some((e) => nombre.endsWith(e))) return `«${archivo.name}»: sólo se aceptan PDF, JPG o PNG.`;
  if (archivo.size > MAX_BYTES) return `«${archivo.name}» supera los ${MAX_MB} MB.`;
  if (archivo.size === 0) return `«${archivo.name}» está vacío.`;
  return null;
}

function etiquetaTipo(item: DocumentoItem): { texto: string; clase: string } {
  const nombre = item.nombre.toLowerCase();
  if (item.contentType === "application/pdf" || nombre.endsWith(".pdf")) return { texto: "PDF", clase: styles.tipoPdf };
  if (item.contentType === "image/png" || nombre.endsWith(".png")) return { texto: "PNG", clase: styles.tipoImg };
  return { texto: "JPG", clase: styles.tipoImg };
}

function peso(bytes?: number): string {
  if (!bytes) return "";
  return bytes >= 1024 * 1024 ? `${(bytes / (1024 * 1024)).toFixed(1).replace(".", ",")} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

const ORIGEN: Record<string, string> = { medico: "Lo subió el médico", colegio: "Lo subió el Colegio" };

/**
 * La lista de documentos de una prestación y la zona para agregar más: ver, reemplazar, eliminar y
 * cambiar el orden. No sabe nada de la API: quien la usa decide qué hace cada acción (el formulario
 * del médico trabaja con archivos locales; el panel del Colegio, con los ya guardados).
 */
export default function DocumentosUploader({
  items, onAgregar, onReemplazar: onReemplazarProp, onEliminar: onEliminarProp, onMover: onMoverProp, onVer,
  ocupado = false, error, textoAgregar, soloLectura = false,
}: Props) {
  const onReemplazar = soloLectura ? undefined : onReemplazarProp;
  const onEliminar = soloLectura ? undefined : onEliminarProp;
  const onMover = soloLectura ? undefined : onMoverProp;
  const idAgregar = useId();
  const refAgregar = useRef<HTMLInputElement>(null);
  const refReemplazar = useRef<HTMLInputElement>(null);
  const [aReemplazar, setAReemplazar] = useState<DocumentoItem | null>(null);
  const [errorLocal, setErrorLocal] = useState<string | null>(null);
  const [arrastrando, setArrastrando] = useState(false);

  const agregar = (lista: FileList | File[] | null) => {
    const archivos = Array.from(lista ?? []);
    if (archivos.length === 0) return;
    const errores = archivos.map(validar).filter((e): e is string => e !== null);
    setErrorLocal(errores.length ? errores.join(" ") : null);
    const validos = archivos.filter((a) => validar(a) === null);
    if (validos.length) void onAgregar(validos);
  };

  const reemplazar = (lista: FileList | null) => {
    const archivo = lista?.[0];
    const destino = aReemplazar;
    setAReemplazar(null);
    if (!archivo || !destino || !onReemplazar) return;
    const motivo = validar(archivo);
    setErrorLocal(motivo);
    if (!motivo) void onReemplazar(destino, archivo);
  };

  const mensaje = error ?? errorLocal;

  return (
    <div className={styles.root}>
      {items.length > 0 && (
        <ul className={styles.lista}>
          {items.map((d, i) => {
            const tipo = etiquetaTipo(d);
            return (
              <li key={d.id} className={styles.item}>
                <div className={styles.datos}>
                  <span className={`${styles.tipo} ${tipo.clase}`}>{tipo.texto}</span>
                  <div className={styles.nombres}>
                    <span className={styles.nombre} title={d.nombre}>{d.nombre}</span>
                    <span className={styles.detalle}>
                      {[peso(d.tamano), d.origen ? ORIGEN[d.origen] : ""].filter(Boolean).join(" · ")}
                    </span>
                  </div>
                </div>
                <div className={styles.acciones}>
                  {onMover && items.length > 1 && (
                    <>
                      <BotonPlano type="button" className={styles.icono} aria-label={`Subir ${d.nombre}`} disabled={ocupado || i === 0} onClick={() => void onMover(d, -1)}>
                        <ArrowUp size={15} />
                      </BotonPlano>
                      <BotonPlano type="button" className={styles.icono} aria-label={`Bajar ${d.nombre}`} disabled={ocupado || i === items.length - 1} onClick={() => void onMover(d, 1)}>
                        <ArrowDown size={15} />
                      </BotonPlano>
                    </>
                  )}
                  <BotonPlano type="button" className={styles.boton} onClick={() => void onVer(d)}>
                    <Eye size={14} aria-hidden="true" /> Ver
                  </BotonPlano>
                  {onReemplazar && (
                    <BotonPlano
                      type="button"
                      className={styles.boton}
                      disabled={ocupado}
                      onClick={() => { setAReemplazar(d); refReemplazar.current?.click(); }}
                    >
                      <RefreshCw size={14} aria-hidden="true" /> Reemplazar
                    </BotonPlano>
                  )}
                  {onEliminar && (
                    <BotonPlano type="button" className={`${styles.boton} ${styles.peligro}`} disabled={ocupado} onClick={() => void onEliminar(d)}>
                      <Trash2 size={14} aria-hidden="true" /> Eliminar
                    </BotonPlano>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {!soloLectura && (
      <>
      <label
        htmlFor={idAgregar}
        className={`${styles.zona} ${arrastrando ? styles.zonaActiva : ""} ${ocupado ? styles.zonaOcupada : ""}`}
        onDragOver={(e) => { e.preventDefault(); if (!ocupado) setArrastrando(true); }}
        onDragLeave={() => setArrastrando(false)}
        onDrop={(e) => { e.preventDefault(); setArrastrando(false); if (!ocupado) agregar(e.dataTransfer.files); }}
      >
        <FileUp size={20} aria-hidden="true" />
        <strong>{items.length === 0 ? "Elegí o arrastrá los archivos" : (textoAgregar ?? "Agregar archivos")}</strong>
        <span>PDF, JPG o PNG · hasta {MAX_MB} MB cada uno · podés subir varios</span>
      </label>
      <input
        id={idAgregar}
        ref={refAgregar}
        type="file"
        multiple
        hidden
        disabled={ocupado}
        accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
        onChange={(e) => {
          agregar(e.target.files);
          // Sin vaciarlo, volver a elegir el mismo archivo no dispara `change`.
          e.target.value = "";
        }}
      />
      <input
        ref={refReemplazar}
        type="file"
        hidden
        accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
        onChange={(e) => {
          reemplazar(e.target.files);
          e.target.value = "";
        }}
      />
      </>
      )}

      {mensaje && <p className={styles.error} role="alert">{mensaje}</p>}
    </div>
  );
}
