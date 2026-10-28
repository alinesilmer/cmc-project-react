import { useRef } from "react";
import { AlertTriangle, FileSpreadsheet, Trash2, Upload } from "lucide-react";
import type { ReactNode } from "react";

import BackButton from "@/app/components/ui/BackButton/BackButton";
import Button from "@/app/components/ui/Button/Button";
import Franja from "@/app/components/layout/Franja/Franja";
import type { EstadoReporte } from "./useReporteConPadron";
import s from "./reporte.module.scss";
import BotonPlano from "@/app/components/ui/BotonPlano/BotonPlano";

/** Un número del resumen que va arriba de la tabla. */
export interface DatoResumen {
  valor: ReactNode;
  label: string;
  /** Lo pinta en naranja: es algo que alguien tiene que mirar. */
  alerta?: boolean;
}

interface Props<T> {
  titulo: string;
  /** Qué archivo se espera, para el estado vacío. */
  ayuda: string;
  estado: EstadoReporte<T>;
  /** Se muestra al lado del nombre del archivo (el rango de fechas, por ejemplo). */
  detalleArchivo?: string;
  resumen?: DatoResumen[];
  /** Controles de filtrado, entre el resumen y la tabla. */
  filtros?: ReactNode;
  /** La tabla. Sólo se renderiza cuando hay filas. */
  children?: ReactNode;
  /** Aviso al pie, para lo que la pantalla todavía no hace. */
  pie?: ReactNode;
  /** `false` mientras no haya nada que mostrar: se ve el estado vacío. */
  hayFilas: boolean;
  /** Extensiones que acepta el input. */
  accept?: string;
  /** A dónde vuelve el enlace de arriba. */
  volverA?: { to: string; label: string };
  /** Acciones al pie, después de la tabla (confirmar el import, por ejemplo). */
  acciones?: ReactNode;
}

/** Andamiaje de las pantallas que leen un reporte de facturación de una obra social: franja, volver, carga del archivo, avisos y resumen. */
export default function ReporteOS<T>({
  titulo,
  ayuda,
  estado,
  detalleArchivo,
  resumen,
  filtros,
  children,
  pie,
  hayFilas,
  accept = ".xlsx,.xls,.csv",
  volverA = { to: "/panel/validaciones", label: "Volver a validaciones" },
  acciones,
}: Props<T>) {
  const inputRef = useRef<HTMLInputElement>(null);

  // El input es no controlado: si no se le borra el valor.
  const resetInput = () => {
    if (inputRef.current) inputRef.current.value = "";
  };

  const limpiar = () => {
    estado.limpiar();
    resetInput();
  };

  return (
    <div className={s.container}>
      <Franja titulo={titulo} icono={FileSpreadsheet} />

      <BackButton label={volverA.label} to={volverA.to} />

      {/* La zona de carga es también el estado vacío: mientras no hay archivo dice qué columnas tiene que traer; con archivo, cuál se leyó. */}
      <div className={`${s.uploader} ${estado.archivo ? s.uploaderLleno : ""}`}>
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          className={s.fileInput}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void estado.cargar(file).finally(resetInput);
          }}
        />

        <span className={s.uploaderIcono}>
          <FileSpreadsheet size={30} aria-hidden="true" />
        </span>

        <div className={s.uploaderTexto}>
          {estado.archivo ? (
            <>
              <strong>{estado.archivo}</strong>
              {detalleArchivo && <span>{detalleArchivo}</span>}
            </>
          ) : (
            <>
              <strong>Subí el reporte</strong>
              <span>{ayuda}</span>
            </>
          )}
        </div>

        <Button
          type="button"
          variant="primary"
          size="lg"
          isLoading={estado.leyendo}
          onClick={() => inputRef.current?.click()}
          leftIcon={<Upload size={18} />}
        >
          {estado.archivo ? "Cambiar" : "Elegir archivo"}
        </Button>

        {estado.archivo && (
          <BotonPlano type="button" className={s.limpiar} onClick={limpiar}>
            <Trash2 size={16} /> Quitar
          </BotonPlano>
        )}
      </div>

      {estado.error && <p className={s.error}>{estado.error}</p>}
      {estado.avisoPadron && (
        <p className={s.aviso}>
          <AlertTriangle size={16} /> {estado.avisoPadron}
        </p>
      )}

      {hayFilas && (
        <>
          {resumen && resumen.length > 0 && (
            <div className={s.resumen}>
              {resumen.map((d) => (
                <div
                  key={d.label}
                  className={d.alerta ? `${s.dato} ${s.datoAlerta}` : s.dato}
                >
                  <strong>{d.valor}</strong>
                  <span>{d.label}</span>
                </div>
              ))}
            </div>
          )}

          {filtros && <div className={s.filtros}>{filtros}</div>}

          {children}

          {acciones && <div className={s.acciones}>{acciones}</div>}

          {pie && (
            <p className={s.pendiente}>
              <AlertTriangle size={16} /> {pie}
            </p>
          )}
        </>
      )}
    </div>
  );
}
