import Button from "../../../components/UI/Button/Button";
import SelectorArchivo from "../../../components/UI/SelectorArchivo/SelectorArchivo";
import IconoArchivo from "../../../components/UI/IconoArchivo/IconoArchivo";
import { useVistaPrevia } from "../../../hooks/useVistaPrevia";
import { DOCUMENTOS, IMAGENES } from "../../../lib/subidas";
import { nombreVisible, tipoDeArchivo } from "../../../lib/documentos";
import type { DocumentoNoticia } from "../../../types";
import estilosForm from "./formPublicacion.module.scss";
import styles from "./ArchivosPublicacion.module.scss";

type Props = {
  portada: File | null;
  portadaGuardada: string;
  onElegirPortada: (archivo: File) => void;
  onQuitarPortada: () => void;
  adjuntosNuevos: File[];
  onAgregarAdjuntos: (archivos: File[]) => void;
  onQuitarAdjunto: (indice: number) => void;
  documentos: DocumentoNoticia[];
  onBorrarDocumento: (id: number) => void;
  onError: (mensaje: string | null) => void;
};

/** Portada, adjuntos a subir y documentos ya guardados de una publicación. */
export default function ArchivosPublicacion(p: Props) {
  const vistaNueva = useVistaPrevia(p.portada);
  const vistaPortada = vistaNueva || p.portadaGuardada;

  return (
    <>
      <div className={estilosForm.inputGroup}>
        <span className={estilosForm.etiqueta}>Portada (opcional)</span>
        <div className={styles.imageRow}>
          <SelectorArchivo extensiones={IMAGENES} onElegir={([f]) => p.onElegirPortada(f)} onError={p.onError}>
            {p.portada ? "Cambiar portada" : vistaPortada ? "Reemplazar portada" : "Subir portada"}
          </SelectorArchivo>
          {vistaPortada && (
            <Button variant="outline" size="medium" onClick={p.onQuitarPortada}>
              Quitar portada
            </Button>
          )}
        </div>
        {vistaPortada && (
          <div className={styles.previewMedia}>
            <img src={vistaPortada} alt="Vista previa de portada" />
          </div>
        )}
      </div>

      <div className={estilosForm.inputGroup}>
        <span className={estilosForm.etiqueta}>Adjuntos (imágenes o PDFs)</span>
        <div className={styles.imageRow}>
          <SelectorArchivo extensiones={DOCUMENTOS} multiple onElegir={p.onAgregarAdjuntos} onError={p.onError}>
            Agregar adjuntos
          </SelectorArchivo>
        </div>
        {p.adjuntosNuevos.length > 0 && (
          <ul className={styles.attachList}>
            {p.adjuntosNuevos.map((f, i) => (
              <li key={`${f.name}-${i}`} className={styles.attachItem}>
                <span className={styles.attachInfo}>
                  <IconoArchivo tipo={tipoDeArchivo(f.type, f.name)} />
                  {f.name}
                </span>
                <button type="button" className={styles.removeBtn} onClick={() => p.onQuitarAdjunto(i)}>
                  Quitar
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {p.documentos.length > 0 && (
        <div className={estilosForm.inputGroup}>
          <span className={estilosForm.etiqueta}>Documentos existentes</span>
          <ul className={styles.attachList}>
            {p.documentos.map((d) => (
              <li key={d.id} className={styles.attachItem}>
                <span className={styles.attachInfo}>
                  <IconoArchivo tipo={tipoDeArchivo(d.content_type, d.path)} />
                  <a href={d.path} target="_blank" rel="noopener noreferrer" title={nombreVisible(d)}>
                    {nombreVisible(d)}
                  </a>
                </span>
                <button type="button" className={styles.removeBtn} onClick={() => p.onBorrarDocumento(d.id)}>
                  Quitar
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
  );
}
