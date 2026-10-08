import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronRight, Loader2, Search, SearchX } from "lucide-react";

import { getHistorialPorCodigo } from "../../NomencladorNacional/nomenclador.api";
import type {
  HistorialCodigoOut,
  HistorialVarianteOut,
  Origen,
  TipoCodigo,
} from "../../NomencladorNacional/nomenclador.types";
import { ORIGEN_LABELS } from "../../NomencladorNacional/nomenclador.types";
import {
  TIPO_CODIGO_LABEL,
  TIPOS_CODIGO,
  tipoDeCategoria,
} from "../../NomencladorNacional/components/tipoCodigo";
import { formatFecha } from "@/app/shared/lib/fechas";
import s from "./ObrasSocialesDetalle.module.scss";
import h from "./HistorialPorCodigo.module.scss";

const PAGE_SIZE = 50;

const money = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const fmt = (v: string) => money.format(Number(v) || 0);

const MOTIVO_LABEL: Record<string, string> = {
  carga_inicial: "Carga inicial",
  galeno_actualizado: "Galeno actualizado",
  valor_fijo_actualizado: "Valor fijo actualizado",
  valores_estructura: "Cambio de estructura",
  replicacion: "Replicación",
  reversion: "Reversión",
  migracion_legacy: "Migración legacy",
};

function Variacion({ pct }: { pct: number | null }) {
  if (pct == null) return <span className={h.varNa}>Primera</span>;
  const cls = pct > 0 ? h.varUp : pct < 0 ? h.varDown : h.varNa;
  const txt = `${pct > 0 ? "+" : ""}${pct.toLocaleString("es-AR", { maximumFractionDigits: 1 })} %`;
  return <span className={cls}>{txt}</span>;
}

function TablaVersiones({ v }: { v: HistorialVarianteOut }) {
  return (
    <div className={h.tablaWrap}>
      <table className={h.tabla}>
        <thead>
          <tr>
            <th>Desde</th>
            <th>Hasta</th>
            <th className={h.r}>Honorarios</th>
            <th className={h.r}>Ayudante</th>
            <th className={h.r}>Gastos</th>
            <th className={h.r}>Total</th>
            <th className={h.r}>Var.</th>
            <th>Motivo</th>
          </tr>
        </thead>
        <tbody>
          {v.versiones.map((x, i) => (
            <tr key={`${x.vigencia_desde}-${i}`} className={x.vigencia_hasta == null ? h.vigente : ""}>
              <td className={h.fecha}>{formatFecha(x.vigencia_desde)}</td>
              <td className={h.fecha}>{x.vigencia_hasta ? formatFecha(x.vigencia_hasta) : "vigente"}</td>
              <td className={h.r}>{fmt(x.honorarios)}</td>
              <td className={h.r}>{fmt(x.ayudante)}</td>
              <td className={h.r}>{fmt(x.gastos)}</td>
              <td className={`${h.r} ${h.total}`}>{fmt(x.total)}</td>
              <td className={h.r}><Variacion pct={x.variacion_pct} /></td>
              <td>{MOTIVO_LABEL[x.motivo_cambio] ?? x.motivo_cambio}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Bloque de un origen (NN o NE) con sus variantes. NN y NE van separados y cada uno
 *  con su color, para que no se confundan los precios de uno y otro. */
function BloqueOrigen({ origen, variantes }: { origen: Origen; variantes: HistorialVarianteOut[] }) {
  return (
    <section className={`${h.bloque} ${origen === "NN" ? h.bloqueNN : h.bloqueNE}`}>
      <header className={h.bloqueHead}>
        <span className={h.origenTag}>{origen}</span>
        <span>{ORIGEN_LABELS[origen]}</span>
      </header>
      {variantes.map((v) => (
        <div key={v.especialidad_id_colegio ?? "base"} className={h.variante}>
          {(origen === "NE" || v.especialidad_id_colegio != null) && (
            <div className={h.varianteNombre}>
              {v.especialidad_id_colegio == null
                ? "Sin especialidad"
                : v.especialidad ?? `Especialidad ${v.especialidad_id_colegio}`}
            </div>
          )}
          <TablaVersiones v={v} />
        </div>
      ))}
    </section>
  );
}

/** Precio vigente de un origen: el de la variante base, o el de la primera. */
function vigenteDe(c: HistorialCodigoOut, origen: Origen): string | null {
  const vs = c.variantes.filter((v) => v.origen === origen);
  const v = vs.find((x) => x.especialidad_id_colegio == null) ?? vs[0];
  const ult = v?.versiones[0];
  return ult && ult.vigencia_hasta == null ? ult.total : null;
}

function FilaCodigo({ c }: { c: HistorialCodigoOut }) {
  const [abierto, setAbierto] = useState(false);
  const tipo = tipoDeCategoria(c.categoria);
  const nn = c.variantes.filter((v) => v.origen === "NN");
  const ne = c.variantes.filter((v) => v.origen === "NE");
  const versiones = c.variantes.reduce((a, v) => a + v.versiones.length, 0);
  const vigNN = vigenteDe(c, "NN");
  const vigNE = vigenteDe(c, "NE");

  return (
    <div className={`${h.codigo} ${abierto ? h.abierto : ""}`}>
      <button type="button" className={h.codigoBtn} aria-expanded={abierto} onClick={() => setAbierto((v) => !v)}>
        <ChevronRight size={15} className={h.caret} />
        <span className={h.cod}>{c.codigo}</span>
        <span className={h.desc} title={c.descripcion}>{c.descripcion || "—"}</span>
        {tipo && <span className={`${h.tipo} ${h[`tipo_${tipo.replace(/\s/g, "")}`] ?? ""}`}>{TIPO_CODIGO_LABEL[tipo]}</span>}
        <span className={h.versiones}>{versiones} versión{versiones === 1 ? "" : "es"}</span>
        <span className={h.vigentes}>
          {nn.length > 0 && <span className={`${h.precio} ${h.precioNN}`}><b>NN</b> {vigNN ? fmt(vigNN) : "sin vigente"}</span>}
          {ne.length > 0 && <span className={`${h.precio} ${h.precioNE}`}><b>NE</b> {vigNE ? fmt(vigNE) : "sin vigente"}{ne.length > 1 ? ` · ${ne.length} var.` : ""}</span>}
        </span>
      </button>
      {abierto && (
        <div className={h.detalle}>
          {nn.length > 0 && <BloqueOrigen origen="NN" variantes={nn} />}
          {ne.length > 0 && <BloqueOrigen origen="NE" variantes={ne} />}
        </div>
      )}
    </div>
  );
}

/**
 * Historial de precios de la obra social, agrupado por código. Dentro de cada código,
 * NN y NE van en bloques separados; las variantes NE por especialidad, cada una con su
 * tabla de versiones (de la más nueva a la más vieja).
 */
export default function HistorialPorCodigo({ obraNro }: { obraNro: number }) {
  const [q, setQ] = useState("");
  const [qDebounced, setQDebounced] = useState("");
  const [tipo, setTipo] = useState<TipoCodigo | "">("");
  const [page, setPage] = useState(1);

  useEffect(() => {
    const t = setTimeout(() => setQDebounced(q.trim()), 300);
    return () => clearTimeout(t);
  }, [q]);
  useEffect(() => setPage(1), [obraNro, qDebounced, tipo]);

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["historial-por-codigo", obraNro, qDebounced, tipo, page],
    queryFn: () =>
      getHistorialPorCodigo({
        obra_social_nro: obraNro,
        q: qDebounced || undefined,
        tipo: tipo || undefined,
        page,
        size: PAGE_SIZE,
      }),
    placeholderData: (prev) => prev,
    staleTime: 5 * 60 * 1000,
  });
  const totalPages = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1;

  return (
    <div className={s.porFechaSection}>
      <div className={h.filtros}>
        <div className={h.campo}>
          <label htmlFor="hpc-q">Código o descripción</label>
          <div className={h.buscar}>
            <Search size={14} />
            <input id="hpc-q" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Ej. 4301" />
          </div>
        </div>
        <div className={h.campo}>
          <label htmlFor="hpc-tipo">Tipo</label>
          <select id="hpc-tipo" className={s.porFechaSelect} value={tipo} onChange={(e) => setTipo(e.target.value as TipoCodigo | "")}>
            <option value="">Todos</option>
            {TIPOS_CODIGO.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>
        <span className={h.cuenta}>
          {isFetching && <Loader2 size={13} className={s.spinIcon} />}
          {data ? `${data.total.toLocaleString("es-AR")} código${data.total === 1 ? "" : "s"}` : ""}
        </span>
      </div>

      {isLoading ? (
        <div className={s.hLoadingState}>
          <Loader2 size={22} className={s.spinIcon} />
          <span>Cargando historial…</span>
        </div>
      ) : !data || data.items.length === 0 ? (
        <div className={s.hEmptyState}>
          <SearchX size={28} />
          <span>{qDebounced || tipo ? "Ningún código coincide con esos filtros." : "Esta obra social no tiene historial de valores."}</span>
        </div>
      ) : (
        <>
          <div className={h.lista}>
            {data.items.map((c) => <FilaCodigo key={c.nomenclador_id} c={c} />)}
          </div>
          {totalPages > 1 && (
            <div className={s.pagination} role="navigation" aria-label="Paginación">
              <button type="button" className={s.pageBtn} disabled={page === 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
                ‹ Anterior
              </button>
              <span className={s.pageInfo}>Página {page} de {totalPages}</span>
              <button type="button" className={s.pageBtn} disabled={page === totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>
                Siguiente ›
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
