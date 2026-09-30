import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Save, Eye, ChevronLeft, ChevronRight } from "lucide-react";

import Button from "@/app/components/ui/Button/Button";
import r from "@/app/pages/Validaciones/components/reporte/reporte.module.scss";
import type { FilaResultado, ImportacionOut, PeriodoOpcion } from "../importaciones.api";
import type { Filtro } from "../useImportador";
import { moneda, periodoLegible } from "../formato";
import s from "./panel.module.scss";

/**
 * Los controles y la tabla de resultado de una importación.
 *
 * Son iguales para cualquier obra social: selector de período, botones de
 * previsualizar y confirmar, y la tabla con el desenlace de cada fila. Lo
 * único que cambia entre reportes es el parser y los endpoints, que viven en
 * la pantalla.
 */

const ETIQUETA: Record<string, string> = {
  grabable: "Entra",
  grabada: "Grabada",
  duplicada: "Ya cargada",
  omitida: "No entra",
};

// ── Controles ────────────────────────────────────────────────────────────────

export function ControlesImportacion({
  periodos,
  periodo,
  setPeriodo,
  trabajando,
  confirmado,
  salida,
  conProblemas,
  filtro,
  setFiltro,
}: {
  periodos: PeriodoOpcion[];
  periodo: string;
  setPeriodo: (p: string) => void;
  trabajando: boolean;
  confirmado: boolean;
  salida: ImportacionOut | null;
  conProblemas: number;
  filtro: Filtro;
  setFiltro: (f: Filtro) => void;
}) {
  return (
    <div className={s.controles}>
      <label className={s.campoPeriodo}>
        <span>Período</span>
        <select
          value={periodo}
          onChange={(e) => setPeriodo(e.target.value)}
          disabled={trabajando || confirmado}
        >
          {periodos.map((p) => (
            <option key={p.periodo} value={p.periodo} disabled={p.cerrado}>
              {periodoLegible(p.periodo)}
              {p.sugerido ? " · actual" : ""}
              {p.cerrado ? " · cerrado" : ""}
            </option>
          ))}
        </select>
      </label>

      {salida && conProblemas > 0 && (
        <label className={r.filtro}>
          <input
            type="checkbox"
            checked={filtro === "problemas"}
            onChange={(e) => setFiltro(e.target.checked ? "problemas" : "todas")}
          />
          Ver sólo las {conProblemas} que no entran
        </label>
      )}
    </div>
  );
}

// ── Acciones ─────────────────────────────────────────────────────────────────

export function AccionesImportacion({
  error,
  confirmado,
  salida,
  trabajando,
  cerrado,
  periodo,
  onCorrer,
}: {
  error: string;
  confirmado: boolean;
  salida: ImportacionOut | null;
  trabajando: boolean;
  cerrado: boolean;
  periodo: string;
  onCorrer: (grabar: boolean) => void;
}) {
  if (confirmado) {
    return (
      <p className={s.hecho}>
        <CheckCircle2 size={17} aria-hidden="true" />
        {salida?.resumen.grabables} prestaciones cargadas en el período{" "}
        {periodoLegible(salida?.resumen.periodo ?? periodo)}.
      </p>
    );
  }

  return (
    <>
      {error && <p className={s.errorInline}>{error}</p>}

      <Button
        type="button"
        variant="secondary"
        isLoading={trabajando && !salida}
        disabled={trabajando || !periodo || cerrado}
        onClick={() => onCorrer(false)}
        leftIcon={<Eye size={17} />}
      >
        Previsualizar
      </Button>

      {/* Sólo después de ver el resultado, y sólo si hay algo que grabar. */}
      <Button
        type="button"
        variant="primary"
        isLoading={trabajando && !!salida}
        disabled={
          trabajando || !salida || salida.resumen.grabables === 0 || cerrado
        }
        onClick={() => onCorrer(true)}
        leftIcon={<Save size={17} />}
      >
        Confirmar e importar
      </Button>
    </>
  );
}

// ── Tabla ────────────────────────────────────────────────────────────────────

/** Filas por página. Un reporte trae entre 500 y 1.200 prácticas: pintarlas
 * todas cuelga el navegador y no hay forma de leerlas de corrido igual. */
const POR_PAGINA = 50;

export function TablaResultado({ filas }: { filas: FilaResultado[] }) {
  const [pagina, setPagina] = useState(1);

  const paginas = Math.max(1, Math.ceil(filas.length / POR_PAGINA));

  // Cambiar de filtro puede dejar la página actual fuera de rango.
  useEffect(() => {
    setPagina((p) => Math.min(p, Math.max(1, Math.ceil(filas.length / POR_PAGINA))));
  }, [filas.length]);

  const visibles = useMemo(
    () => filas.slice((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA),
    [filas, pagina]
  );

  if (filas.length === 0) {
    return <p className={s.espera}>No hay filas que mostrar con este filtro.</p>;
  }

  return (
    <>
    <div className={r.tableWrap}>
      <table className={r.table}>
        <thead>
          <tr>
            <th className={r.num}>#</th>
            <th>Estado</th>
            <th>Autorización</th>
            <th>Fecha</th>
            <th className={r.num}>Matrícula</th>
            <th>Médico</th>
            <th className={r.num}>Código</th>
            <th>Práctica</th>
            <th className={r.num}>Importe</th>
            <th>Motivo</th>
          </tr>
        </thead>
        <tbody>
          {visibles.map((f) => {
            const entra = f.resultado === "grabable" || f.resultado === "grabada";
            return (
              <tr key={f.indice} className={entra ? undefined : s.noEntra}>
                <td className={r.num}>{f.indice + 1}</td>
                <td>
                  <span className={`${s.chip} ${s[f.resultado]}`}>
                    {ETIQUETA[f.resultado] ?? f.resultado}
                  </span>
                </td>
                <td>{f.nroAutorizacion || "—"}</td>
                <td>{f.fecha ?? "—"}</td>
                <td className={r.num}>{f.matricula || "—"}</td>
                <td>
                  {f.medico || "—"}
                  {f.nroSocio !== null && (
                    <span className={s.socio}>{f.nroSocio}</span>
                  )}
                </td>
                <td className={r.num}>{f.codigo || "—"}</td>
                <td className={s.practica}>{f.descripcion}</td>
                <td className={r.num}>
                  {entra ? moneda.format(f.importeTotal) : "—"}
                </td>
                <td className={s.motivo}>{f.motivo || "—"}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>

    {paginas > 1 && (
      <nav className={s.paginado} aria-label="Paginado de resultados">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          disabled={pagina === 1}
          onClick={() => setPagina((p) => p - 1)}
          leftIcon={<ChevronLeft size={16} />}
        >
          Anterior
        </Button>

        <span className={s.paginaActual} aria-live="polite">
          {(pagina - 1) * POR_PAGINA + 1}–
          {Math.min(pagina * POR_PAGINA, filas.length)} de {filas.length}
        </span>

        <Button
          type="button"
          variant="secondary"
          size="sm"
          disabled={pagina === paginas}
          onClick={() => setPagina((p) => p + 1)}
          rightIcon={<ChevronRight size={16} />}
        >
          Siguiente
        </Button>
      </nav>
    )}
    </>
  );
}

export function Espera({ children }: { children: React.ReactNode }) {
  return <p className={s.espera}>{children}</p>;
}
