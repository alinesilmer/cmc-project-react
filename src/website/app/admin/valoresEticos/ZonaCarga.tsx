import { useRef, useState } from "react";
import { CloudUpload, FileText, X } from "lucide-react";

import s from "./ZonaCarga.module.scss";
import BotonAccion from "@/app/components/ui/BotonAccion/BotonAccion";
import Button from "@/app/components/ui/Button/Button";
import c from "@/app/components/ui/Paso/Campos.module.scss";
import { PDF, accept, motivoDeRechazo } from "@/website/lib/subidas";

type Props = {
  subiendo: boolean;
  onSubir: (archivo: File, observaciones: string) => Promise<boolean>;
  onError: (mensaje: string | null) => void;
};

const enMb = (bytes: number) => (bytes / 1024 / 1024).toFixed(2);

/** Observaciones, zona para arrastrar el PDF y el botón de carga. */
export default function ZonaCarga({ subiendo, onSubir, onError }: Props) {
  const [archivo, setArchivo] = useState<File | null>(null);
  const [observaciones, setObservaciones] = useState("");
  const [arrastrando, setArrastrando] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  // Se valida extensión y tamaño: el `type` del navegador llega vacío para varios archivos y el `accept` del input es sólo una sugerencia.
  const elegir = (f: File | null) => {
    if (!f) return;
    const motivo = motivoDeRechazo(f, PDF);
    onError(motivo);
    if (!motivo) setArchivo(f);
  };

  const limpiar = () => {
    setArchivo(null);
    setObservaciones("");
  };

  const subir = async () => {
    if (archivo && (await onSubir(archivo, observaciones))) limpiar();
  };

  return (
    <>
      <div className={`${c.campo} ${c.campoAncho}`}>
        <label className={c.rotulo} htmlFor="etica-obs">Observaciones (opcional)</label>
        <textarea
          id="etica-obs"
          className={c.entrada}
          value={observaciones}
          onChange={(e) => setObservaciones(e.target.value)}
          placeholder="Ej: Versión aprobada mayo 2026"
          rows={2}
          maxLength={500}
        />
      </div>

      <div
        className={`${s.zona} ${arrastrando ? s.activa : ""} ${archivo ? s.llena : ""}`}
        role="button"
        tabIndex={0}
        aria-label="Elegir un PDF"
        onClick={() => input.current?.click()}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            input.current?.click();
          }
        }}
        onDragOver={(e) => {
          e.preventDefault();
          setArrastrando(true);
        }}
        onDragLeave={() => setArrastrando(false)}
        onDrop={(e) => {
          e.preventDefault();
          setArrastrando(false);
          elegir(e.dataTransfer.files[0] ?? null);
        }}
      >
        <input
          ref={input}
          type="file"
          accept={accept(PDF)}
          className={s.entrada}
          tabIndex={-1}
          aria-hidden="true"
          onClick={(e) => e.stopPropagation()}
          onChange={(e) => {
            elegir(e.target.files?.[0] ?? null);
            e.target.value = "";
          }}
        />
        {archivo ? (
          <div className={s.elegido}>
            <FileText size={28} aria-hidden="true" />
            <span className={s.nombre}>{archivo.name}</span>
            <span className={s.tamano}>{enMb(archivo.size)} MB</span>
            <BotonAccion
              icono={X}
              etiqueta="Quitar archivo"
              onClick={(e) => {
                e.stopPropagation();
                setArchivo(null);
              }}
            />
          </div>
        ) : (
          <div className={s.vacia}>
            <CloudUpload size={36} aria-hidden="true" />
            <p className={s.texto}>
              Arrastrá un PDF acá o <span>hacé click para elegirlo</span>
            </p>
            <p className={s.limite}>Sólo PDF · hasta 20 MB</p>
          </div>
        )}
      </div>

      <div className={c.acciones}>
        <Button
          leftIcon={<CloudUpload size={16} aria-hidden="true" />}
          disabled={!archivo}
          isLoading={subiendo}
          onClick={subir}
        >
          Subir y reemplazar PDF
        </Button>
        {archivo && !subiendo && (
          <Button variant="ghost" onClick={limpiar}>
            Cancelar
          </Button>
        )}
      </div>
    </>
  );
}
