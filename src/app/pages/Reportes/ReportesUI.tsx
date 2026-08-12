import type React from "react";
import { memo } from "react";
import {
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Download,
  FileSpreadsheet,
  Search,
  X,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import styles from "./Reportes.module.scss";
import {
  ESTADO_LABEL,
  TOPES,
  etiquetaTope,
  money,
  moneyCompacto,
  numero,
  periodoCorto,
  periodoLargo,
  type PuntoSerie,
  type Tope,
  type ValidacionEstado,
} from "./reportes.types";

// Piezas compartidas por el reporte del Colegio y el del médico. Son las mismas
// lecturas con distinto alcance: mantenerlas acá evita que se separen.

// ─── KPI ──────────────────────────────────────────────────────────────────────

export const Kpi = memo(function Kpi({
  label,
  value,
  hint,
  accent,
}: {
  label: string;
  value: string;
  hint?: string;
  accent?: "gold" | "blue" | "green";
}) {
  const acc = accent
    ? styles[`kpiAccent${accent[0].toUpperCase()}${accent.slice(1)}`]
    : "";
  return (
    <div className={`${styles.kpi} ${acc}`}>
      <span className={styles.kpiLabel}>{label}</span>
      <span className={styles.kpiValue}>{value}</span>
      {hint && <span className={styles.kpiHint}>{hint}</span>}
    </div>
  );
});

// ─── Estados ──────────────────────────────────────────────────────────────────

export function Cargando({ filas = 3 }: { filas?: number }) {
  return (
    <div style={{ display: "grid", gap: 8 }} aria-busy="true" aria-live="polite">
      {Array.from({ length: filas }).map((_, i) => (
        <div key={i} className={styles.skeleton} />
      ))}
    </div>
  );
}

export function Vacio({ children }: { children: React.ReactNode }) {
  return <div className={styles.empty}>{children}</div>;
}

export function ErrorBox({ children }: { children: React.ReactNode }) {
  return (
    <div className={styles.error} role="alert">
      <AlertCircle size={16} />
      {children}
    </div>
  );
}

// ─── Chip de estado de validación ─────────────────────────────────────────────

export function EstadoChip({ estado }: { estado: ValidacionEstado | null }) {
  if (!estado) {
    // Sin estado = la cargó el Colegio, no pasó por el validador de la O.S.
    return <span className={`${styles.chip} ${styles.chipNeutro}`}>Sin validar</span>;
  }
  const clase =
    estado === "autorizada"
      ? styles.chipAutorizada
      : estado === "rechazada"
        ? styles.chipRechazada
        : estado === "pendiente"
          ? styles.chipPendiente
          : styles.chipCargada;
  return <span className={`${styles.chip} ${clase}`}>{ESTADO_LABEL[estado]}</span>;
}

// ─── Tooltips de los gráficos ─────────────────────────────────────────────────

/** Recharts pasa el punto completo en `payload[n].payload`. */
type TooltipProps<T> = {
  active?: boolean;
  payload?: { payload: T }[];
};

function TooltipSerie({ active, payload }: TooltipProps<PuntoSerie>) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <div className={styles.tooltip}>
      <p className={styles.tooltipTitle}>{periodoLargo(p.periodo)}</p>
      <p className={styles.tooltipRow}>{money.format(p.importe_total)}</p>
      <p className={styles.tooltipRow}>
        {numero.format(p.prestaciones)} prestaciones
      </p>
    </div>
  );
}

function TooltipBarra({ active, payload }: TooltipProps<BarraDato>) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <div className={styles.tooltip}>
      <p className={styles.tooltipTitle}>{p.etiqueta}</p>
      <p className={styles.tooltipRow}>{money.format(p.valor)}</p>
      {p.detalle && <p className={styles.tooltipRow}>{p.detalle}</p>}
    </div>
  );
}

// ─── Gráfico de evolución ─────────────────────────────────────────────────────

export const GraficoEvolucion = memo(function GraficoEvolucion({
  datos,
}: {
  datos: PuntoSerie[];
}) {
  if (!datos.length) return <Vacio>Todavía no hay períodos con movimiento.</Vacio>;

  return (
    <div className={styles.chart}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={datos} margin={{ top: 8, right: 12, bottom: 4, left: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
          <XAxis
            dataKey="periodo"
            tickFormatter={periodoCorto}
            tick={{ fontSize: 11, fill: "#64748b" }}
            tickLine={false}
            axisLine={{ stroke: "#cbd5e1" }}
          />
          <YAxis
            tickFormatter={moneyCompacto}
            tick={{ fontSize: 11, fill: "#64748b" }}
            tickLine={false}
            axisLine={false}
            width={54}
          />
          <Tooltip content={<TooltipSerie />} />
          <Line
            type="monotone"
            dataKey="importe_total"
            stroke="#173f70"
            strokeWidth={2}
            dot={{ r: 2.5, fill: "#173f70" }}
            activeDot={{ r: 4.5 }}
            // Sin animación: con 24 puntos y re-render por cambio de filtro,
            // animar cada vez se ve nervioso y no aporta nada.
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
});

// ─── Gráfico de barras horizontal (rankings) ──────────────────────────────────

export interface BarraDato {
  etiqueta: string;
  valor: number;
  detalle?: string;
}

const PALETA = ["#173f70", "#1b4c88", "#3455c1", "#5a79e1", "#7e97ea", "#a2b4f0"];

export const GraficoRanking = memo(function GraficoRanking({
  datos,
}: {
  datos: BarraDato[];
}) {
  if (!datos.length) return <Vacio>Sin datos para este período.</Vacio>;

  return (
    <div className={styles.chart}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={datos}
          layout="vertical"
          margin={{ top: 4, right: 16, bottom: 4, left: 4 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
          <XAxis
            type="number"
            tickFormatter={moneyCompacto}
            tick={{ fontSize: 11, fill: "#64748b" }}
            tickLine={false}
            axisLine={{ stroke: "#cbd5e1" }}
          />
          <YAxis
            type="category"
            dataKey="etiqueta"
            tick={{ fontSize: 11, fill: "#475569" }}
            tickLine={false}
            axisLine={false}
            width={120}
          />
          <Tooltip content={<TooltipBarra />} cursor={{ fill: "rgba(90,121,225,0.06)" }} />
          <Bar dataKey="valor" isAnimationActive={false}>
            {datos.map((_, i) => (
              <Cell key={i} fill={PALETA[i % PALETA.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
});

// ─── Paginador ────────────────────────────────────────────────────────────────

export function Pager({
  offset,
  limit,
  total,
  onChange,
  cargando,
}: {
  offset: number;
  limit: number;
  total: number;
  onChange: (offset: number) => void;
  cargando?: boolean;
}) {
  const desde = total === 0 ? 0 : offset + 1;
  const hasta = Math.min(offset + limit, total);
  const hayAnterior = offset > 0;
  const haySiguiente = hasta < total;

  return (
    <div className={styles.pager}>
      <span className={styles.pagerInfo}>
        {total === 0
          ? "Sin resultados"
          : `${numero.format(desde)}–${numero.format(hasta)} de ${numero.format(total)}`}
      </span>
      <div className={styles.pagerBtns}>
        <button
          type="button"
          className={styles.pageBtn}
          onClick={() => onChange(Math.max(0, offset - limit))}
          disabled={!hayAnterior || cargando}
        >
          <ChevronLeft size={15} /> Anterior
        </button>
        <button
          type="button"
          className={styles.pageBtn}
          onClick={() => onChange(offset + limit)}
          disabled={!haySiguiente || cargando}
        >
          Siguiente <ChevronRight size={15} />
        </button>
      </div>
    </div>
  );
}

// ─── Tamaño del ranking ───────────────────────────────────────────────────────
// Las constantes viven en reportes.types.ts: este archivo exporta sólo
// componentes, si no se rompe el fast refresh de Vite.

export function SelectorTope({
  value,
  onChange,
  id,
}: {
  value: Tope;
  onChange: (t: Tope) => void;
  id: string;
}) {
  return (
    <div className={styles.field}>
      <label className={styles.label} htmlFor={id}>
        Mostrar
      </label>
      <select
        id={id}
        className={styles.select}
        value={value}
        onChange={(e) => onChange(Number(e.target.value) as Tope)}
      >
        {TOPES.map((t) => (
          <option key={t} value={t}>
            {etiquetaTope(t)}
          </option>
        ))}
      </select>
    </div>
  );
}

// ─── Buscador ─────────────────────────────────────────────────────────────────

/**
 * Caja de búsqueda de una tabla.
 *
 * El texto se debounce en el contenedor, NO acá: así el input responde a cada
 * tecla (se siente instantáneo) mientras el pedido al servidor sale recién
 * cuando el usuario frena.
 */
export function Buscador({
  value,
  onChange,
  placeholder,
  id,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  id: string;
}) {
  return (
    <div className={styles.field}>
      <label className={styles.label} htmlFor={id}>
        Buscar
      </label>
      <div className={styles.searchBox}>
        <Search size={15} className={styles.searchIcon} aria-hidden="true" />
        <input
          id={id}
          type="search"
          className={styles.searchInput}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
        />
        {value && (
          <button
            type="button"
            className={styles.searchClear}
            onClick={() => onChange("")}
            aria-label="Limpiar búsqueda"
          >
            <X size={14} />
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Exportar ─────────────────────────────────────────────────────────────────

export function BotonesExportar({
  onCsv,
  onExcel,
  disabled,
}: {
  onCsv: () => void;
  onExcel: () => void;
  disabled?: boolean;
}) {
  return (
    <div className={styles.exportBtns}>
      <button
        type="button"
        className={styles.pageBtn}
        onClick={onCsv}
        disabled={disabled}
        title="Descargar en CSV"
      >
        <Download size={14} /> CSV
      </button>
      <button
        type="button"
        className={styles.pageBtn}
        onClick={onExcel}
        disabled={disabled}
        title="Descargar en Excel"
      >
        <FileSpreadsheet size={14} /> Excel
      </button>
    </div>
  );
}

// ─── Gráfico de torta (participación) ─────────────────────────────────────────

export const GraficoTorta = memo(function GraficoTorta({
  datos,
}: {
  datos: BarraDato[];
}) {
  if (!datos.length) return <Vacio>Sin datos para este período.</Vacio>;

  return (
    <div className={styles.chart}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={datos}
            dataKey="valor"
            nameKey="etiqueta"
            // Dona y no torta: el agujero deja leer las proporciones sin que el
            // ojo compare áreas, que es donde la torta engaña.
            innerRadius="52%"
            outerRadius="80%"
            paddingAngle={1.5}
            isAnimationActive={false}
          >
            {datos.map((_, i) => (
              <Cell key={i} fill={PALETA[i % PALETA.length]} />
            ))}
          </Pie>
          <Tooltip content={<TooltipBarra />} />
          <Legend
            verticalAlign="bottom"
            height={28}
            wrapperStyle={{ fontSize: 11 }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
});

// ─── Selector de mes y año ────────────────────────────────────────────────────

const MESES_OPC = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

/**
 * Mes y año por separado.
 *
 * La facturación se organiza por período YYYYMM, pero nadie piensa "202608":
 * piensa "agosto" y "2026". Se muestran dos selects y se arma el período
 * internamente, que es lo que espera la API.
 */
export function SelectorMesAnio({
  periodo,
  onChange,
  anios,
}: {
  periodo: string;
  onChange: (periodo: string) => void;
  anios: number[];
}) {
  const anio = Number(periodo.slice(0, 4));
  const mes = Number(periodo.slice(4, 6));

  const armar = (a: number, m: number) => `${a}${String(m).padStart(2, "0")}`;

  return (
    <>
      <div className={styles.field}>
        <label className={styles.label} htmlFor="mes">
          Mes
        </label>
        <select
          id="mes"
          className={styles.select}
          value={mes}
          onChange={(e) => onChange(armar(anio, Number(e.target.value)))}
        >
          {MESES_OPC.map((nombre, i) => (
            <option key={nombre} value={i + 1}>
              {nombre}
            </option>
          ))}
        </select>
      </div>
      <div className={styles.field}>
        <label className={styles.label} htmlFor="anio">
          Año
        </label>
        <select
          id="anio"
          className={styles.select}
          value={anio}
          onChange={(e) => onChange(armar(Number(e.target.value), mes))}
        >
          {anios.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>
      </div>
    </>
  );
}

/**
 * Paginador para las tablas AGREGADAS (códigos, médicos).
 *
 * Esas consultas devuelven un array sin total: contar cuántos grupos distintos
 * hay exigiría un `COUNT(DISTINCT …)` extra por cada pedido, y no vale ese
 * costo sólo para escribir "de N". Se usa la regla clásica: si volvió una
 * página completa, es probable que haya otra.
 */
export function PagerSimple({
  offset,
  limit,
  cantidad,
  onChange,
  cargando,
}: {
  offset: number;
  limit: number;
  cantidad: number;
  onChange: (offset: number) => void;
  cargando?: boolean;
}) {
  const hayAnterior = offset > 0;
  const haySiguiente = cantidad === limit;

  // Sin páginas que ofrecer, el paginador no aporta nada.
  if (!hayAnterior && !haySiguiente) return null;

  return (
    <div className={styles.pager}>
      <span className={styles.pagerInfo}>
        {cantidad === 0
          ? "Sin resultados"
          : `${numero.format(offset + 1)}–${numero.format(offset + cantidad)}`}
      </span>
      <div className={styles.pagerBtns}>
        <button
          type="button"
          className={styles.pageBtn}
          onClick={() => onChange(Math.max(0, offset - limit))}
          disabled={!hayAnterior || cargando}
        >
          <ChevronLeft size={15} /> Anterior
        </button>
        <button
          type="button"
          className={styles.pageBtn}
          onClick={() => onChange(offset + limit)}
          disabled={!haySiguiente || cargando}
        >
          Siguiente <ChevronRight size={15} />
        </button>
      </div>
    </div>
  );
}

// ─── Selector de período ──────────────────────────────────────────────────────

export function SelectorPeriodo({
  value,
  onChange,
  periodos,
  id = "periodo",
}: {
  value: string;
  onChange: (v: string) => void;
  periodos: string[];
  id?: string;
}) {
  return (
    <div className={styles.field}>
      <label className={styles.label} htmlFor={id}>
        Período
      </label>
      <select
        id={id}
        className={styles.select}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {periodos.map((p) => (
          <option key={p} value={p}>
            {periodoLargo(p)}
          </option>
        ))}
      </select>
    </div>
  );
}
