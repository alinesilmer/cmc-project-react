/**
 * Validación de archivos antes de subirlos, espejando lo que exige la API.
 *
 * **Esto no es la barrera de seguridad.** Quien decide de verdad es el backend
 * (`app/common/uploads.py`), que mira los *magic bytes* del archivo y no el
 * nombre ni el `content-type` que declara el navegador — cualquiera de los dos
 * se falsea. Acá se replican las mismas reglas por dos motivos prácticos:
 *
 * 1. Sin esto, un archivo de 200 MB se sube entero para que la API lo rechace
 *    recién al final. Con conexiones del interior eso son minutos perdidos.
 * 2. El `accept` de un `<input type="file">` es sólo una sugerencia del
 *    diálogo: el usuario elige «Todos los archivos» y manda lo que quiera.
 *
 * Si cambian los límites en `app/core/config.py::MAX_UPLOAD_BYTES` o las listas
 * de `app/common/uploads.py`, hay que cambiarlos acá también.
 */

/** `settings.MAX_UPLOAD_BYTES` del backend. */
const MAX_BYTES = 20 * 1024 * 1024;

/** `IMAGENES` de `app/common/uploads.py`. */
export const IMAGENES = [".jpg", ".jpeg", ".png", ".gif", ".webp", ".bmp"] as const;

/** `DOCUMENTOS` de `app/common/uploads.py`: imágenes y PDF. */
export const DOCUMENTOS = [".pdf", ".jpg", ".jpeg", ".png", ".webp", ".tiff"] as const;

/** Sólo PDF, para los valores éticos. */
export const PDF = [".pdf"] as const;

export type Extensiones = readonly string[];

/** El `accept` del input, derivado de la misma lista, para que no se separen. */
export const accept = (exts: Extensiones): string => exts.join(",");

const extensionDe = (nombre: string): string => {
  const i = nombre.lastIndexOf(".");
  return i === -1 ? "" : nombre.slice(i).toLowerCase();
};

const enMb = (bytes: number): string =>
  (bytes / 1024 / 1024).toFixed(bytes < 1024 * 1024 ? 2 : 1);

/**
 * `null` si el archivo pasa; si no, el motivo ya redactado para mostrar.
 */
export function motivoDeRechazo(file: File, exts: Extensiones): string | null {
  const ext = extensionDe(file.name);

  if (!ext) {
    return `«${file.name}» no tiene extensión, así que no podemos saber qué es.`;
  }
  if (!exts.includes(ext)) {
    return `«${file.name}» es un ${ext} y acá sólo entran ${exts.join(", ")}.`;
  }
  if (file.size === 0) {
    return `«${file.name}» está vacío.`;
  }
  if (file.size > MAX_BYTES) {
    return (
      `«${file.name}» pesa ${enMb(file.size)} MB y el máximo son ` +
      `${enMb(MAX_BYTES)} MB. Comprimilo o subilo en partes.`
    );
  }
  return null;
}

/** Separa los que pasan de los motivos por los que se descartó el resto. */
export function filtrarValidos(
  files: File[],
  exts: Extensiones
): { validos: File[]; errores: string[] } {
  const validos: File[] = [];
  const errores: string[] = [];
  for (const f of files) {
    const motivo = motivoDeRechazo(f, exts);
    if (motivo) errores.push(motivo);
    else validos.push(f);
  }
  return { validos, errores };
}
