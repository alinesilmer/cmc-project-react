import { useEffect, useMemo } from "react";

import ReporteOS from "@/app/pages/Validaciones/components/reporte/ReporteOS";
import type { DatoResumen } from "@/app/pages/Validaciones/components/reporte/ReporteOS";
import { useReporteConPadron } from "@/app/pages/Validaciones/components/reporte/useReporteConPadron";

import { leerArchivoUnne } from "./unne.parser";
import type { PrestacionUnne, ReporteUnne } from "./unne.parser";
import {
  confirmarUnne,
  fetchPeriodosUnne,
  previsualizarUnne,
} from "./importaciones.api";
import { useEleccionSocio } from "./useEleccionSocio";
import { useImportador } from "./useImportador";
import {
  AccionesImportacion,
  ControlesImportacion,
  Espera,
  TablaResultado,
} from "./components/PanelImportacion";
import { moneda, periodoLegible } from "./formato";

/**
 * Importación del Excel que exporta el sistema de UNNE (O.S. 81).
 *
 * Mismo circuito que Swiss y Prevención (previsualizar → confirmar), con dos
 * diferencias:
 *
 *  * **El importe lo pone UNNE.** No se recotiza: nuestro nomenclador sólo
 *    parte las filas "Hon+Gto" en honorarios y gastos, y avisa si no coincide.
 *  * **Matrículas con más de un socio, o con ninguno.** En vez de descartarlas,
 *    quedan en «Elegir socio»: se elige acá, fila por fila, o se descartan, y
 *    se vuelve a previsualizar antes de confirmar.
 */

const MENSAJE_VACIO = "El archivo no tiene ninguna orden para leer.";

const AYUDA =
  "Subí el Excel que exporta el sistema de UNNE (presentación de liquidación web, .xlsx), " +
  "con las columnas Matrícula, Reg., Orden N°, Fecha Práctica, Cantidad, Práctica, " +
  "Función, DNI Paciente e Importe.";

const contar = (rep: ReporteUnne) => rep.prestaciones.length;

/** Referencia estable para "todavía no hay archivo". */
const SIN_PRESTACIONES: PrestacionUnne[] = [];

export default function ImportarUnne() {
  const estado = useReporteConPadron(leerArchivoUnne, {
    contar,
    mensajeVacio: MENSAJE_VACIO,
    conPadron: false,
  });

  const prestaciones = useMemo(
    () => estado.reporte?.prestaciones ?? SIN_PRESTACIONES,
    [estado.reporte]
  );

  const socio = useEleccionSocio(prestaciones);
  const { aplicar, revisado } = socio;

  const API = useMemo(
    () => ({
      periodos: fetchPeriodosUnne,
      previsualizar: async (filas: PrestacionUnne[], periodo: string, archivo: string) => {
        const res = await previsualizarUnne(aplicar(filas), periodo, archivo);
        revisado();
        return res;
      },
      confirmar: (filas: PrestacionUnne[], periodo: string, archivo: string) =>
        confirmarUnne(aplicar(filas), periodo, archivo),
    }),
    [aplicar, revisado]
  );

  const imp = useImportador(API, prestaciones, estado.archivo);
  const { setPeriodo } = imp;

  // Período: por defecto el que declara el Excel. Si todavía no tiene cabecera
  // de facturación, igual se ofrece (se crea al confirmar).
  const periodoArchivo = estado.reporte?.periodo ?? "";
  const periodos = useMemo(() => {
    if (!periodoArchivo || imp.periodos.some((p) => p.periodo === periodoArchivo)) return imp.periodos;
    return [{ periodo: periodoArchivo, cerrado: false, sugerido: false }, ...imp.periodos]
      .sort((a, b) => b.periodo.localeCompare(a.periodo));
  }, [imp.periodos, periodoArchivo]);
  useEffect(() => {
    const op = periodos.find((p) => p.periodo === periodoArchivo);
    if (op && !op.cerrado) setPeriodo(periodoArchivo);
  }, [periodoArchivo, periodos, setPeriodo]);

  const totalArchivo = useMemo(() => prestaciones.reduce((a, p) => a + p.importe, 0), [prestaciones]);

  const resumen: DatoResumen[] = useMemo(() => {
    if (!imp.salida) {
      return [
        { valor: prestaciones.length, label: "Prácticas en el archivo" },
        { valor: new Set(prestaciones.map((p) => p.orden)).size, label: "Órdenes" },
        { valor: new Set(prestaciones.map((p) => p.matricula)).size, label: "Matrículas" },
        { valor: moneda.format(totalArchivo), label: "Importe del archivo" },
      ];
    }
    const x = imp.salida.resumen;
    const datos: DatoResumen[] = [
      { valor: x.total, label: "Prácticas" },
      { valor: x.grabables, label: imp.confirmado ? "Grabadas" : "Se van a grabar" },
      { valor: moneda.format(x.importeTotal), label: `Importe (archivo ${moneda.format(totalArchivo)})` },
    ];
    if (x.porElegir > 0) datos.push({ valor: x.porElegir, label: "Elegir socio", alerta: true });
    if (x.duplicadas > 0) datos.push({ valor: x.duplicadas, label: "Ya cargadas", alerta: true });
    if (x.omitidas > 0) datos.push({ valor: x.omitidas, label: "No entran", alerta: true });
    if (x.conAviso > 0) datos.push({ valor: x.conAviso, label: "Con aviso" });
    return datos;
  }, [imp.salida, imp.confirmado, prestaciones, totalArchivo]);

  const bloqueo = socio.bloqueo(imp.salida);

  const otroPeriodo =
    periodoArchivo && imp.periodo && imp.periodo !== periodoArchivo
      ? `Ojo: el Excel es de ${periodoLegible(periodoArchivo)} y lo vas a cargar en ${periodoLegible(imp.periodo)}.`
      : undefined;

  return (
    <ReporteOS
      titulo="Importar UNNE"
      subtitulo="Subí el Excel que exporta el sistema de UNNE, revisá cómo queda repartido y confirmá para cargarlo en facturación."
      ayuda={AYUDA}
      estado={estado}
      detalleArchivo={estado.reporte?.rango}
      resumen={resumen}
      hayFilas={prestaciones.length > 0}
      volverA={{ to: "/panel/importaciones", label: "Volver a importaciones" }}
      accept=".xlsx"
      filtros={<ControlesImportacion {...imp} periodos={periodos} />}
      acciones={<AccionesImportacion {...imp} bloqueo={bloqueo} onCorrer={(g) => void imp.correr(g)} />}
      pie={
        imp.cerrado
          ? "Ese período está cerrado por el Colegio: elegí otro para poder importar."
          : otroPeriodo ?? (!imp.salida ? "Previsualizá antes de confirmar: nada se graba hasta que lo confirmes." : undefined)
      }
    >
      {imp.salida ? (
        <TablaResultado filas={imp.visibles} elegirSocio={socio.elegirSocio} />
      ) : (
        <Espera>Elegí el período y tocá «Previsualizar» para ver cómo queda repartido.</Espera>
      )}
    </ReporteOS>
  );
}
