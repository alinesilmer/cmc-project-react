import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import ReporteOS from "@/app/pages/Validaciones/components/reporte/ReporteOS";
import type { DatoResumen } from "@/app/pages/Validaciones/components/reporte/ReporteOS";
import { useReporteConPadron } from "@/app/pages/Validaciones/components/reporte/useReporteConPadron";
import AppSearchSelect from "@/app/components/ui/AppSearchSelect/AppSearchSelect";
import type { AppSearchSelectOption } from "@/app/components/ui/AppSearchSelect/AppSearchSelect";
import { fetchMedicos } from "@/app/pages/facturacion/api";

import { leerArchivoUnne } from "./unne.parser";
import type { PrestacionUnne, ReporteUnne } from "./unne.parser";
import {
  confirmarUnne,
  fetchPeriodosUnne,
  previsualizarUnne,
} from "./importaciones.api";
import type { FilaResultado, PrestacionUnneElegida } from "./importaciones.api";
import { useImportador } from "./useImportador";
import {
  AccionesImportacion,
  ControlesImportacion,
  Espera,
  TablaResultado,
} from "./components/PanelImportacion";
import { moneda, periodoLegible } from "./formato";
import s from "./components/panel.module.scss";

/**
 * Importación del Excel que exporta el sistema de UNNE (O.S. 81).
 *
 * Mismo circuito que Swiss y Prevención (previsualizar → confirmar), con dos
 * diferencias:
 *
 *  * **El importe lo pone UNNE.** No se recotiza: nuestro nomenclador sólo
 *    parte las filas "Hon+Gto" en honorarios y gastos, y avisa si no coincide.
 *  * **Matrículas con más de un socio, o con ninguno.** En vez de descartarlas,
 *    quedan en «Elegir socio»: se elige acá (vale para todas las filas de esa
 *    matrícula) o se descartan, y se vuelve a previsualizar antes de confirmar.
 */

const MENSAJE_VACIO = "El archivo no tiene ninguna orden para leer.";

const AYUDA =
  "Subí el Excel que exporta el sistema de UNNE (presentación de liquidación web, .xlsx), " +
  "con las columnas Matrícula, Reg., Orden N°, Fecha Práctica, Cantidad, Práctica, " +
  "Función, DNI Paciente e Importe.";

const contar = (rep: ReporteUnne) => rep.prestaciones.length;

/** Referencia estable para "todavía no hay archivo". */
const SIN_PRESTACIONES: PrestacionUnne[] = [];

/** Buscador de socio para una matrícula que no cae en ninguno. */
function BuscarSocio({ valor, onElegir }: { valor: number | null; onElegir: (n: number | null) => void }) {
  const [opciones, setOpciones] = useState<AppSearchSelectOption[]>([]);
  const [cargando, setCargando] = useState(false);
  const buscar = useCallback(async (q: string) => {
    if (q.trim().length < 2) return;
    setCargando(true);
    try {
      const res = await fetchMedicos(q, 20);
      setOpciones(res.map((m) => ({ id: Number(m.cod), label: `${m.cod} · ${m.nombre}`, subtitle: m.matricula ? `Mat. ${m.matricula}` : undefined })));
    } finally {
      setCargando(false);
    }
  }, []);
  return (
    <AppSearchSelect
      options={opciones}
      value={valor}
      loading={cargando}
      onQueryChange={(q) => void buscar(q)}
      onChange={(v) => onElegir(v == null ? null : Number(v))}
    />
  );
}

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

  // Socio elegido por matrícula y matrículas descartadas. Viven aparte de las
  // prestaciones (y se aplican al mandar) para que elegir no borre la tabla:
  // `useImportador` limpia la previsualización cuando cambian las filas.
  const [elecciones, setElecciones] = useState<Record<string, number>>({});
  const [descartadas, setDescartadas] = useState<Set<string>>(new Set());
  const [sinRevisar, setSinRevisar] = useState(false);
  const decisiones = useRef({ elecciones, descartadas });
  decisiones.current = { elecciones, descartadas };

  useEffect(() => {
    setElecciones({});
    setDescartadas(new Set());
    setSinRevisar(false);
  }, [prestaciones]);

  const API = useMemo(() => {
    const aplicar = (filas: PrestacionUnne[]): PrestacionUnneElegida[] => {
      const { elecciones: e, descartadas: d } = decisiones.current;
      return filas
        .filter((p) => !d.has(p.matricula))
        .map((p) => (e[p.matricula] ? { ...p, nroSocioElegido: e[p.matricula] } : p));
    };
    return {
      periodos: fetchPeriodosUnne,
      previsualizar: async (filas: PrestacionUnne[], periodo: string, archivo: string) => {
        const res = await previsualizarUnne(aplicar(filas), periodo, archivo);
        setSinRevisar(false);
        return res;
      },
      confirmar: (filas: PrestacionUnne[], periodo: string, archivo: string) =>
        confirmarUnne(aplicar(filas), periodo, archivo),
    };
  }, []);

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

  const elegir = (matricula: string, nro: number | null) => {
    setElecciones((prev) => {
      const next = { ...prev };
      if (nro == null) delete next[matricula];
      else next[matricula] = nro;
      return next;
    });
    setSinRevisar(true);
  };
  const descartar = (matricula: string) => {
    setDescartadas((prev) => new Set(prev).add(matricula));
    setSinRevisar(true);
  };

  const elegirSocio = (f: FilaResultado) => {
    if (descartadas.has(f.matricula)) {
      return <span className={s.aviso}>Descartada: se quita al volver a previsualizar.</span>;
    }
    const valor = elecciones[f.matricula] ?? null;
    return (
      <div className={s.elegirSocio}>
        {f.candidatos.length > 0 ? (
          <select value={valor ?? ""} onChange={(e) => elegir(f.matricula, e.target.value ? Number(e.target.value) : null)}>
            <option value="">Elegí el socio…</option>
            {f.candidatos.map((c) => (
              <option key={c.nroSocio} value={c.nroSocio}>{c.nroSocio} · {c.nombre}</option>
            ))}
          </select>
        ) : (
          <BuscarSocio valor={valor} onElegir={(n) => elegir(f.matricula, n)} />
        )}
        <button type="button" className={s.descartar} onClick={() => descartar(f.matricula)}>
          Descartar las filas de esta matrícula
        </button>
      </div>
    );
  };

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

  const bloqueo = sinRevisar
    ? "Volvé a previsualizar para aplicar los socios elegidos."
    : imp.salida && imp.salida.resumen.porElegir > 0
      ? `Elegí el socio de ${imp.salida.resumen.porElegir} filas, o descartalas, y volvé a previsualizar.`
      : undefined;

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
        <TablaResultado filas={imp.visibles} elegirSocio={elegirSocio} />
      ) : (
        <Espera>Elegí el período y tocá «Previsualizar» para ver cómo queda repartido.</Espera>
      )}
    </ReporteOS>
  );
}
