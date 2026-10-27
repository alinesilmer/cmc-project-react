import { X } from "lucide-react";

import s from "./ArchivosPublicacion.module.scss";
import Button from "@/app/components/ui/Button/Button";
import c from "@/app/components/ui/Paso/Campos.module.scss";
import SelectorArchivo from "@/website/components/UI/SelectorArchivo/SelectorArchivo";
import IconoArchivo from "@/website/components/UI/IconoArchivo/IconoArchivo";
import { useVistaPrevia } from "@/website/hooks/useVistaPrevia";
import { DOCUMENTOS, IMAGENES } from "@/website/lib/subidas";
import { nombreVisible, tipoDeArchivo } from "@/website/lib/documentos";
import type { DocumentoNoticia } from "@/website/types";

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
      <div className={`${c.campo} ${c.campoAncho}`}>
        <span className={c.rotulo}>Portada (opcional)</span>
        <div className={s.fila}>
          <SelectorArchivo extensiones={IMAGENES} variant="outline" onElegir={([f]) => p.onElegirPortada(f)} onError={p.onError}>
            {p.portada ? "Cambiar portada" : vistaPortada ? "Reemplazar portada" : "Subir portada"}
          </SelectorArchivo>
          {vistaPortada && (
            <Button variant="ghost" onClick={p.onQuitarPortada}>
              Quitar portada
            </Button>
          )}
        </div>
        {vistaPortada && (
          <div className={s.portada}>
            <img src={vistaPortada} alt="Vista previa de portada" />
          </div>
        )}
      </div>

      <div className={`${c.campo} ${c.campoAncho}`}>
        <span className={c.rotulo}>Adjuntos (imágenes o PDFs)</span>
        <div className={s.fila}>
          <SelectorArchivo extensiones={DOCUMENTOS} variant="outline" multiple onElegir={p.onAgregarAdjuntos} onError={p.onError}>
            Agregar adjuntos
          </SelectorArchivo>
        </div>
        {p.adjuntosNuevos.length > 0 && (
          <ul className={s.lista}>
            {p.adjuntosNuevos.map((f, i) => (
              <li key={`${f.name}-${i}`} className={s.item}>
                <span className={s.nombre}>
                  <IconoArchivo tipo={tipoDeArchivo(f.type, f.name)} />
                  {f.name}
                </span>
                <Button variant="ghost" size="sm" leftIcon={<X size={14} aria-hidden="true" />} onClick={() => p.onQuitarAdjunto(i)}>
                  Quitar
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {p.documentos.length > 0 && (
        <div className={`${c.campo} ${c.campoAncho}`}>
          <span className={c.rotulo}>Documentos existentes</span>
          <ul className={s.lista}>
            {p.documentos.map((d) => (
              <li key={d.id} className={s.item}>
                <span className={s.nombre}>
                  <IconoArchivo tipo={tipoDeArchivo(d.content_type, d.path)} />
                  <a href={d.path} target="_blank" rel="noopener noreferrer" title={nombreVisible(d)}>
                    {nombreVisible(d)}
                  </a>
                </span>
                <Button variant="ghost" size="sm" leftIcon={<X size={14} aria-hidden="true" />} onClick={() => p.onBorrarDocumento(d.id)}>
                  Quitar
                </Button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
  );
}
