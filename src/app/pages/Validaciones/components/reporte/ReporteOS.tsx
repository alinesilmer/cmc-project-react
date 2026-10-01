import { useRef } from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, ArrowLeft, FileSpreadsheet, Trash2, Upload } from "lucide-react";
import type { ReactNode } from "react";

import Button from "@/app/components/ui/Button/Button";
import type { EstadoReporte } from "./useReporteConPadron";
import s from "./reporte.module.scss";

/** Un número del resumen que va arriba de la tabla. */
export interface DatoResumen {
  valor: ReactNode;
  label: string;
  /** Lo pinta en naranja: es algo que alguien tiene que mirar. */
  alerta?: boolean;
}

interface Props<T> {
  titulo: string;
  subtitulo: string;
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

/**
 * Andamiaje de las pantallas que leen un reporte de facturación de una obra
 * social: volver, encabezado, carga del archivo, avisos, resumen y estado
 * vacío. La tabla la pone cada pantalla, porque las columnas no se parecen.
 *
 * Existe porque Prevención Salud y Swiss Medical hacen lo mismo con archivos
 * distintos; todo lo que no sea la tabla y el parser se resuelve una sola vez
 * acá.
 */
export default function ReporteOS<T>({
  titulo,
  subtitulo,
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

  // El input es no controlado: si no se le borra el valor, volver a elegir el
  // mismo archivo no dispara `change` y parece que la pantalla se colgó.
  const resetInput = () => {
    if (inputRef.current) inputRef.current.value = "";
  };

  const limpiar = () => {
    estado.limpiar();
    resetInput();
  };

  return (
    <div className={s.container}>
      <Link to={volverA.to} className={s.back}>
        <ArrowLeft size={16} /> {volverA.label}
      </Link>

      <header className={s.header}>
        <FileSpreadsheet size={32} className={s.headerIcon} />
        <div>
          <h1 className={s.title}>{titulo}</h1>
          <p className={s.subtitle}>{subtitulo}</p>
        </div>
      </header>

      <div className={s.uploader}>
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

        <Button
          type="button"
          variant="primary"
          isLoading={estado.leyendo}
          onClick={() => inputRef.current?.click()}
          leftIcon={<Upload size={18} />}
        >
          Subir reporte
        </Button>

        {estado.archivo && (
          <>
            <span className={s.archivo}>
              {estado.archivo}
              {detalleArchivo && ` · ${detalleArchivo}`}
            </span>
            <button type="button" className={s.limpiar} onClick={limpiar}>
              <Trash2 size={15} /> Quitar
            </button>
          </>
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

      {!hayFilas && !estado.error && (
        <div className={s.empty}>
          <FileSpreadsheet size={30} />
          <p>{ayuda}</p>
        </div>
      )}
    </div>
  );
}
