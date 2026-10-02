import { useMemo } from "react";

import ReporteOS from "@/app/pages/Validaciones/components/reporte/ReporteOS";
import type { DatoResumen } from "@/app/pages/Validaciones/components/reporte/ReporteOS";
import { useReporteConPadron } from "@/app/pages/Validaciones/components/reporte/useReporteConPadron";
import { leerArchivoPrevencion } from "@/app/pages/Validaciones/prevencion.parser";
import type {
  PrestacionPrevencion,
  ReportePrevencion,
} from "@/app/pages/Validaciones/prevencion.parser";

import {
  confirmarPrevencion,
  fetchPeriodosPrevencion,
  previsualizarPrevencion,
} from "./importaciones.api";
import { useImportador } from "./useImportador";
import {
  AccionesImportacion,
  ControlesImportacion,
  Espera,
  TablaResultado,
} from "./components/PanelImportacion";
import { moneda } from "./formato";

/**
 * Importación del reporte mensual de Prevención Salud.
 *
 * Tres pasos, sin saltear ninguno: subir el archivo —lo lee el mismo parser
 * que `/panel/validaciones/prevencion-salud`—, elegir período y previsualizar,
 * y recién ahí confirmar.
 *
 * La previsualización es obligatoria a propósito: es donde se ve una matrícula
 * que no cayó en ningún socio o un código que la obra social no tiene
 * cotizado, antes de que exista una sola fila en facturación.
 */

const MENSAJE_VACIO = "El archivo no tiene ninguna práctica para leer.";

const AYUDA =
  "Subí el reporte de facturación de Prevención Salud (.xlsx, .xls o .csv). " +
  "Se usan Número de Autorización, Fecha de Realización, Afiliado, Matrícula MP, " +
  "Práctica(s) Realizada(s) y Estado; el resto de las columnas se ignora.";

const contar = (rep: ReportePrevencion) => rep.prestaciones.length;

/** Referencia estable para "todavía no hay archivo". */
const SIN_PRESTACIONES: PrestacionPrevencion[] = [];

const API = {
  periodos: fetchPeriodosPrevencion,
  previsualizar: previsualizarPrevencion,
  confirmar: confirmarPrevencion,
};

export default function ImportarPrevencion() {
  const estado = useReporteConPadron(leerArchivoPrevencion, {
    contar,
    mensajeVacio: MENSAJE_VACIO,
    conPadron: false,
  });

  const prestaciones = useMemo(
    () => estado.reporte?.prestaciones ?? SIN_PRESTACIONES,
    [estado.reporte]
  );

  const imp = useImportador(API, prestaciones, estado.archivo);

  const resumen: DatoResumen[] = useMemo(() => {
    if (!imp.salida) {
      return [
        { valor: prestaciones.length, label: "Prácticas en el archivo" },
        {
          valor: new Set(prestaciones.map((p) => p.matricula)).size,
          label: "Matrículas",
        },
      ];
    }
    const x = imp.salida.resumen;
    const datos: DatoResumen[] = [
      { valor: x.total, label: "Prácticas" },
      { valor: x.grabables, label: imp.confirmado ? "Grabadas" : "Se van a grabar" },
      { valor: moneda.format(x.importeTotal), label: "Importe" },
    ];
    if (x.sinMedico > 0) datos.push({ valor: x.sinMedico, label: "Sin médico", alerta: true });
    if (x.duplicadas > 0) datos.push({ valor: x.duplicadas, label: "Ya cargadas", alerta: true });
    if (x.omitidas > 0) datos.push({ valor: x.omitidas, label: "No entran", alerta: true });
    if (x.rechazadas > 0) datos.push({ valor: x.rechazadas, label: "Rechazadas por la O.S." });
    return datos;
  }, [imp.salida, imp.confirmado, prestaciones]);

  return (
    <ReporteOS
      titulo="Importar Prevención Salud"
      subtitulo="Subí el reporte mensual, revisá cómo queda repartido y confirmá para cargarlo en facturación."
      ayuda={AYUDA}
      estado={estado}
      detalleArchivo={estado.reporte?.rango}
      resumen={resumen}
      hayFilas={prestaciones.length > 0}
      volverA={{ to: "/panel/importaciones", label: "Volver a importaciones" }}
      filtros={<ControlesImportacion {...imp} />}
      acciones={<AccionesImportacion {...imp} onCorrer={(g) => void imp.correr(g)} />}
      pie={
        imp.cerrado
          ? "Ese período está cerrado por el Colegio: elegí otro para poder importar."
          : !imp.salida
            ? "Previsualizá antes de confirmar: nada se graba hasta que lo confirmes."
            : undefined
      }
    >
      {imp.salida ? (
        <TablaResultado filas={imp.visibles} />
      ) : (
        <Espera>
          Elegí el período y tocá «Previsualizar» para ver cómo queda repartido.
        </Espera>
      )}
    </ReporteOS>
  );
}
