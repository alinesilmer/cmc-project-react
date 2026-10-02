import { Download, ExternalLink } from "lucide-react";
import Button from "../../UI/Button/Button";
import IconoArchivo from "../../UI/IconoArchivo/IconoArchivo";
import { agruparPorTipo, nombreVisible } from "../../../lib/documentos";
import type { DocumentoNoticia } from "../../../types";
import styles from "./DocumentosPublicacion.module.scss";

type Props = { documentos: DocumentoNoticia[] };

/**
 * Los adjuntos de una publicación: el primer PDF se muestra embebido (suele
 * ser la norma o el programa del curso), las imágenes en galería y el resto
 * como lista de descargas.
 */
export default function DocumentosPublicacion({ documentos }: Props) {
  const { pdf, imagen, otro } = agruparPorTipo(documentos);
  const [destacado, ...otrosPdf] = pdf;
  const lista = [...otrosPdf, ...otro];

  if (documentos.length === 0) return null;

  return (
    <section className={styles.documentos} aria-label="Archivos">
      {destacado && (
        <div className={styles.pdf}>
          <div className={styles.pdfBarra}>
            <span className={styles.icono} aria-hidden="true">
              <IconoArchivo tipo="pdf" size={20} />
            </span>
            <span className={styles.nombre}>{nombreVisible(destacado)}</span>
            <div className={styles.pdfAcciones}>
              <Button href={destacado.path} nuevaPestana variant="outline" size="small" iconoIzquierda={<ExternalLink />}>
                Abrir
              </Button>
              <Button href={destacado.path} download size="small" iconoIzquierda={<Download />}>
                Descargar
              </Button>
            </div>
          </div>

          <object data={destacado.path} type="application/pdf" className={styles.pdfVista}>
            <p className={styles.sinVista}>
              No se pudo mostrar el PDF acá.{" "}
              <a href={destacado.path} target="_blank" rel="noopener noreferrer">
                Abrilo en otra pestaña
              </a>
              .
            </p>
          </object>
        </div>
      )}

      {imagen.length > 0 && (
        <div className={styles.imagenes}>
          {imagen.map((img) => (
            <a key={img.id} href={img.path} target="_blank" rel="noopener noreferrer">
              <img src={img.path} alt={nombreVisible(img)} loading="lazy" decoding="async" />
            </a>
          ))}
        </div>
      )}

      {lista.length > 0 && (
        <ul className={styles.lista}>
          {lista.map((doc) => (
            <li key={doc.id} className={styles.archivo}>
              <span className={styles.icono} aria-hidden="true">
                <IconoArchivo tipo={pdf.includes(doc) ? "pdf" : "otro"} size={20} />
              </span>
              <a href={doc.path} target="_blank" rel="noopener noreferrer" className={styles.nombre}>
                {nombreVisible(doc)}
              </a>
              <a href={doc.path} download className={styles.descargar} aria-label={`Descargar ${nombreVisible(doc)}`}>
                <Download aria-hidden="true" />
              </a>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
