import { useMemo, useState } from "react";

import ReporteOS from "@/app/pages/Validaciones/components/reporte/ReporteOS";
import type { DatoResumen } from "@/app/pages/Validaciones/components/reporte/ReporteOS";
import { useReporteConPadron } from "@/app/pages/Validaciones/components/reporte/useReporteConPadron";
import { leerArchivoPrevencion } from "@/app/pages/Validaciones/prevencion.parser";
import type {
  PrestacionPrevencion,
  ReportePrevencion,
} from "@/app/pages/Validaciones/prevencion.parser";

import {
  OBRAS_PREVENCION,
  confirmarPrevencion,
  fetchPeriodosPrevencion,
  previsualizarPrevencion,
} from "./importaciones.api";
import { useEleccionSocio } from "./useEleccionSocio";
import { useImportador } from "./useImportador";
import {
  AccionesImportacion,
  ControlesImportacion,
  Espera,
  TablaResultado,
} from "./components/PanelImportacion";
import { moneda } from "./formato";
import s from "./components/panel.module.scss";

/**
 * Importación del reporte mensual de Prevención Salud.
 *
 * Tres pasos, sin saltear ninguno: subir el archivo —lo lee el mismo parser
 * que `/panel/validaciones/prevencion-salud`—, elegir obra social y período y
 * previsualizar, y recién ahí confirmar.
 *
 * La previsualización es obligatoria a propósito: es donde se ve una matrícula
 * que no cayó en ningún socio o un código que la obra social no tiene
 * cotizado, antes de que exista una sola fila en facturación. Las matrículas
 * repetidas o sin socio quedan en «Elegir socio», como en UNNE.
 *
 * La obra social es la 103 o la 888, que es de prueba: mismo nomenclador, para
 * ensayar la importación sin tocar la facturación real.
 */

const MENSAJE_VACIO = "El archivo no tiene ninguna práctica para leer.";

const AYUDA =
  "Subí el reporte de facturación de Prevención Salud (.xlsx, .xls o .csv). " +
  "Se usan Número de Autorización, Fecha de Realización, Afiliado, Matrícula MP, " +
  "Práctica(s) Realizada(s) y Estado; el resto de las columnas se ignora.";

const contar = (rep: ReportePrevencion) => rep.prestaciones.length;

/** Referencia estable para "todavía no hay archivo". */
const SIN_PRESTACIONES: PrestacionPrevencion[] = [];

const PRUEBA = 888;

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

  const [obraSocial, setObraSocial] = useState<number>(OBRAS_PREVENCION[0].nro);

  const socio = useEleccionSocio(prestaciones);
  const { aplicar, revisado } = socio;

  const API = useMemo(
    () => ({
      periodos: () => fetchPeriodosPrevencion(obraSocial),
      previsualizar: async (filas: PrestacionPrevencion[], periodo: string, archivo: string) => {
        const res = await previsualizarPrevencion(aplicar(filas), periodo, archivo, obraSocial);
        revisado();
        return res;
      },
      confirmar: (filas: PrestacionPrevencion[], periodo: string, archivo: string) =>
        confirmarPrevencion(aplicar(filas), periodo, archivo, obraSocial),
    }),
    [aplicar, revisado, obraSocial]
  );

  const imp = useImportador(API, prestaciones, estado.archivo, obraSocial);

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
    if (x.porElegir > 0) datos.push({ valor: x.porElegir, label: "Elegir socio", alerta: true });
    if (x.duplicadas > 0) datos.push({ valor: x.duplicadas, label: "Ya cargadas", alerta: true });
    if (x.omitidas > 0) datos.push({ valor: x.omitidas, label: "No entran", alerta: true });
    if (x.conAviso > 0) datos.push({ valor: x.conAviso, label: "Con aviso", alerta: true });
    if (x.rechazadas > 0) datos.push({ valor: x.rechazadas, label: "Rechazadas por la O.S." });
    return datos;
  }, [imp.salida, imp.confirmado, prestaciones]);

  const selectorObraSocial = (
    <label className={s.campoPeriodo}>
      <span>Obra social</span>
      <select
        value={obraSocial}
        onChange={(e) => setObraSocial(Number(e.target.value))}
        disabled={imp.trabajando || imp.confirmado}
      >
        {OBRAS_PREVENCION.map((o) => (
          <option key={o.nro} value={o.nro}>
            {o.nro} · {o.nombre}
          </option>
        ))}
      </select>
    </label>
  );

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
      filtros={<ControlesImportacion {...imp} antes={selectorObraSocial} />}
      acciones={
        <AccionesImportacion
          {...imp}
          bloqueo={socio.bloqueo(imp.salida)}
          onCorrer={(g) => void imp.correr(g)}
        />
      }
      pie={
        imp.cerrado
          ? "Ese período está cerrado por el Colegio: elegí otro para poder importar."
          : obraSocial === PRUEBA
            ? "Estás cargando en la O.S. 888, de prueba: no toca la facturación real de Prevención."
            : !imp.salida
              ? "Previsualizá antes de confirmar: nada se graba hasta que lo confirmes."
              : undefined
      }
    >
      {imp.salida ? (
        <TablaResultado filas={imp.visibles} elegirSocio={socio.elegirSocio} />
      ) : (
        <Espera>
          Elegí la obra social y el período, y tocá «Previsualizar» para ver cómo queda repartido.
        </Espera>
      )}
    </ReporteOS>
  );
}
