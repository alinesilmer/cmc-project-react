import { useMemo } from "react";

import ReporteOS from "@/app/pages/Validaciones/components/reporte/ReporteOS";
import type { DatoResumen } from "@/app/pages/Validaciones/components/reporte/ReporteOS";
import { useReporteConPadron } from "@/app/pages/Validaciones/components/reporte/useReporteConPadron";
import {
  esDeOtraProvincia,
  leerArchivoSwiss,
} from "@/app/pages/Validaciones/swissMedical.parser";
import type {
  PrestacionSwiss,
  ReporteSwiss,
} from "@/app/pages/Validaciones/swissMedical.parser";

import {
  confirmarSwiss,
  fetchPeriodosSwiss,
  previsualizarSwiss,
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
 * Importación del reporte de liquidación de Swiss Medical.
 *
 * Mismo circuito que Prevención, con tres diferencias que vienen del reporte:
 *
 *  * **El código hay que traducirlo.** Swiss factura con códigos de ocho
 *    dígitos y el Colegio usa seis. La traducción la hace el backend
 *    (`importaciones/swiss/homologador.py`), no esta pantalla.
 *  * **El copago ya lo cobró el médico en el consultorio**, así que se
 *    descuenta del importe que se le factura a la obra social.
 *  * **La matrícula trae la provincia** ("W-3972"). Las que no son de
 *    Corrientes no se pueden resolver contra el padrón del Colegio y quedan
 *    fuera: el número solo puede ser de otro médico en otra provincia.
 */

const MENSAJE_VACIO = "El archivo no tiene ninguna práctica para leer.";

const AYUDA =
  "Subí el reporte de liquidación de Swiss Medical (.xlsx), con las columnas " +
  "transacción_ticket, transacción_item, fecha_prestacion, credencial, " +
  "apellido_afiliado, prestación, cantidad, autorización, copago y " +
  "efector_matricula.";

const contar = (rep: ReporteSwiss) => rep.prestaciones.length;

/** Referencia estable para "todavía no hay archivo". */
const SIN_PRESTACIONES: PrestacionSwiss[] = [];

const API = {
  periodos: fetchPeriodosSwiss,
  previsualizar: previsualizarSwiss,
  confirmar: confirmarSwiss,
};

export default function ImportarSwiss() {
  const estado = useReporteConPadron(leerArchivoSwiss, {
    contar,
    mensajeVacio: MENSAJE_VACIO,
  });

  const prestaciones = useMemo(
    () => estado.reporte?.prestaciones ?? SIN_PRESTACIONES,
    [estado.reporte]
  );

  const imp = useImportador(API, prestaciones, estado.archivo);

  const resumen: DatoResumen[] = useMemo(() => {
    if (!imp.salida) {
      const otraProvincia = prestaciones.filter(esDeOtraProvincia).length;
      const datos: DatoResumen[] = [
        { valor: prestaciones.length, label: "Prácticas en el archivo" },
        {
          valor: new Set(prestaciones.map((p) => p.ticket)).size,
          label: "Tickets",
        },
        {
          valor: new Set(prestaciones.map((p) => p.matricula)).size,
          label: "Matrículas",
        },
        {
          valor: moneda.format(prestaciones.reduce((a, p) => a + p.copago, 0)),
          label: "Copago",
        },
      ];
      if (otraProvincia > 0) {
        datos.push({ valor: otraProvincia, label: "De otra provincia", alerta: true });
      }
      return datos;
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
    return datos;
  }, [imp.salida, imp.confirmado, prestaciones]);

  return (
    <ReporteOS
      titulo="Importar Swiss Medical"
      subtitulo="Subí el reporte de liquidación, revisá cómo queda repartido y confirmá para cargarlo en facturación."
      ayuda={AYUDA}
      estado={estado}
      detalleArchivo={estado.reporte?.rango}
      resumen={resumen}
      hayFilas={prestaciones.length > 0}
      volverA={{ to: "/panel/importaciones", label: "Volver a importaciones" }}
      accept=".xlsx"
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
