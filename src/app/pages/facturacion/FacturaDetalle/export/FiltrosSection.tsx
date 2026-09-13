import { useMemo, useState } from "react";
import type { Tipo } from "../../types";
import type { ExportFiltros } from "./types";
import s from "./export.module.scss";

const TIPOS: Tipo[] = ["Consulta", "Practica", "Honorarios individuales", "Sanatorio"];

interface PrestadorOpcion {
  cod_medico: string;
  nombre: string | null;
}

interface Props {
  filtros: ExportFiltros;
  onChange: (filtros: ExportFiltros) => void;
  prestadores: PrestadorOpcion[];
}

export default function FiltrosSection({ filtros, onChange, prestadores }: Props) {
  const [busquedaSocio, setBusquedaSocio] = useState("");

  const set = <K extends keyof ExportFiltros>(key: K, value: ExportFiltros[K]) =>
    onChange({ ...filtros, [key]: value });

  const socios = filtros.cod_medicos ?? [];
  const prestadoresFiltrados = useMemo(() => {
    const q = busquedaSocio.trim().toLowerCase();
    if (!q) return prestadores.slice(0, 30);
    return prestadores
      .filter((p) => (p.nombre ?? "").toLowerCase().includes(q) || p.cod_medico.includes(q))
      .slice(0, 30);
  }, [busquedaSocio, prestadores]);

  const toggleSocio = (cod: string) => {
    set("cod_medicos", socios.includes(cod) ? socios.filter((c) => c !== cod) : [...socios, cod]);
  };

  const toggleTipo = (tipo: Tipo) => {
    const actuales = filtros.tipos ?? [];
    set("tipos", actuales.includes(tipo) ? actuales.filter((t) => t !== tipo) : [...actuales, tipo]);
  };

  return (
    <div className={s.section}>
      <div className={s.sectionHeader}>
        <h3 className={s.sectionTitle}>Filtros</h3>
      </div>

      <div className={s.filterGrid}>
        <div className={s.filterRow2}>
          <div className={s.filterField}>
            <label className={s.filterLabel}>Fecha desde</label>
            <input
              type="date" className={s.filterInput}
              value={filtros.fecha_desde ?? ""}
              onChange={(e) => set("fecha_desde", e.target.value || undefined)}
            />
          </div>
          <div className={s.filterField}>
            <label className={s.filterLabel}>Fecha hasta</label>
            <input
              type="date" className={s.filterInput}
              value={filtros.fecha_hasta ?? ""}
              onChange={(e) => set("fecha_hasta", e.target.value || undefined)}
            />
          </div>
        </div>

        <div className={s.filterField}>
          <label className={s.filterLabel}>Revisado</label>
          <select
            className={s.filterSelect}
            value={filtros.revisado === undefined ? "" : filtros.revisado ? "si" : "no"}
            onChange={(e) => {
              const v = e.target.value;
              set("revisado", v === "" ? undefined : v === "si");
            }}
          >
            <option value="">Todas</option>
            <option value="si">Sólo revisadas</option>
            <option value="no">Sólo no revisadas</option>
          </select>
        </div>

        <div className={s.filterField}>
          <label className={s.filterLabel}>Especialidad (ID Colegio)</label>
          <input
            type="number" className={s.filterInput} placeholder="Todas"
            value={filtros.id_especialidad ?? ""}
            onChange={(e) => set("id_especialidad", e.target.value ? Number(e.target.value) : undefined)}
          />
        </div>

        <div className={s.filterField}>
          <label className={s.filterLabel}>Tipo de prestación</label>
          <div className={s.chipToggleRow}>
            {TIPOS.map((t) => (
              <button
                key={t}
                type="button"
                className={`${s.chipToggle} ${(filtros.tipos ?? []).includes(t) ? s.chipToggleOn : ""}`}
                onClick={() => toggleTipo(t)}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        <div className={s.filterField}>
          <label className={s.filterLabel}>Socios ({socios.length} seleccionados)</label>
          {socios.length > 0 && (
            <div className={s.chipRow}>
              {socios.map((cod) => {
                const p = prestadores.find((x) => x.cod_medico === cod);
                return (
                  <span key={cod} className={s.chip}>
                    {p?.nombre ?? cod}
                    <button type="button" className={s.chipRemove} onClick={() => toggleSocio(cod)}>×</button>
                  </span>
                );
              })}
            </div>
          )}
          <input
            type="search" className={s.filterInput} placeholder="Buscar prestador…"
            value={busquedaSocio}
            onChange={(e) => setBusquedaSocio(e.target.value)}
          />
          <div className={s.sociosList}>
            {prestadoresFiltrados.map((p) => (
              <label key={p.cod_medico} className={s.socioOption}>
                <input
                  type="checkbox"
                  checked={socios.includes(p.cod_medico)}
                  onChange={() => toggleSocio(p.cod_medico)}
                />
                <span>{p.nombre ?? `Socio ${p.cod_medico}`}</span>
              </label>
            ))}
            {prestadoresFiltrados.length === 0 && (
              <p className={s.sectionHint}>Sin coincidencias.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
