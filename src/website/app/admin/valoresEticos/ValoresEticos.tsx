import { useState } from "react";
import { FileText, Upload } from "lucide-react";

import ZonaCarga from "./ZonaCarga";
import HistorialValores from "./HistorialValores";
import VerPdf from "./VerPdf";
import { useValoresEticos } from "./useValoresEticos";
import s from "./ValoresEticos.module.scss";
import Cargando from "@/app/components/ui/Cargando/Cargando";
import Paso from "@/app/components/ui/Paso/Paso";
import c from "@/app/components/ui/Paso/Campos.module.scss";
import { ErrorAccion } from "@/app/components/ui/ResultadoAccion/ResultadoAccion";
import { useConfirmacion } from "@/app/hooks/useConfirmacion";
import { useNotify } from "@/app/hooks/useNotify";
import { formatearFecha } from "@/website/lib/fechas";
import { nombreDeRuta } from "@/website/lib/documentos";

/** La solapa «Valores Éticos»: el PDF vigente, la carga de uno nuevo y el historial. */
export default function ValoresEticos() {
  const { ultimo, historial, cargando, errorCarga, subir, borrar } = useValoresEticos();
  const { pedir, modal } = useConfirmacion();
  const notify = useNotify();
  const [subiendo, setSubiendo] = useState(false);
  const [borrando, setBorrando] = useState<number | null>(null);

  const avisarError = (mensaje: string | null) => {
    if (mensaje) notify.error(mensaje);
  };

  const alSubir = async (archivo: File, observaciones: string) => {
    setSubiendo(true);
    try {
      await subir(archivo, observaciones);
      notify.success("PDF subido correctamente.");
      return true;
    } catch {
      notify.error("No se pudo subir el archivo. Intentá de nuevo.");
      return false;
    } finally {
      setSubiendo(false);
    }
  };

  const eliminar = async (id: number) => {
    setBorrando(id);
    try {
      await borrar(id);
    } catch {
      notify.error("No se pudo eliminar. Intentá de nuevo.");
    } finally {
      setBorrando(null);
    }
  };

  const alBorrar = (id: number) =>
    pedir({ titulo: "Eliminar registro", mensaje: "¿Eliminar este registro y su archivo?" }, () => void eliminar(id));

  return (
    <>
      <Paso icono={FileText} titulo="Archivo actual">
        {errorCarga && <ErrorAccion>No se pudo cargar el archivo actual.</ErrorAccion>}
        {cargando ? (
          <p className={c.ayuda}>
            <Cargando size={14} /> Cargando…
          </p>
        ) : ultimo ? (
          <div className={s.actual}>
            <div className={s.datos}>
              <span className={s.nombre}>{nombreDeRuta(ultimo.pdf_path)}</span>
              <span className={s.fecha}>{formatearFecha(ultimo.fecha_update, "conHora")}</span>
              {ultimo.observaciones && <span className={s.observaciones}>{ultimo.observaciones}</span>}
            </div>
            <VerPdf ruta={ultimo.pdf_path} etiqueta="Ver PDF" onError={avisarError} />
          </div>
        ) : (
          <p className={c.ayuda}>Todavía no hay un archivo cargado.</p>
        )}
        <p className={c.ayuda}>Es el Boletín de Valores Éticos Mínimos del Inicio y del Login. Sigue visible hasta que subas otro.</p>
      </Paso>

      <Paso icono={Upload} titulo="Subir uno nuevo">
        <ZonaCarga subiendo={subiendo} onSubir={alSubir} onError={avisarError} />
      </Paso>

      {!cargando && <HistorialValores historial={historial} borrando={borrando} onBorrar={alBorrar} onError={avisarError} />}
      {modal}
    </>
  );
}
