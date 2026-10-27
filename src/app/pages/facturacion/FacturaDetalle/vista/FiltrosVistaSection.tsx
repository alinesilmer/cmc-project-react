import { useMemo, useState } from "react";
import type { Tipo } from "../../types";
import type { FiltroDocumentacion, FiltrosVista } from "./types";
import s from "../export/export.module.scss";
import CampoFecha from "@/app/components/ui/CampoFecha/CampoFecha";
import BotonPlano from "@/app/components/ui/BotonPlano/BotonPlano";

const TIPOS: Tipo[] = ["Consulta", "Practica", "Honorarios individuales", "Sanatorio"];

interface PrestadorOpcion {
  cod_medico: string;
  nombre: string | null;
}

interface Props {
  filtros: FiltrosVista;
  onChange: (filtros: FiltrosVista) => void;
  prestadores: PrestadorOpcion[];
  /** La obra social tiene la documentación digital: se ofrece el filtro de documentación. */
  conDocumentacion?: boolean;
}

export default function FiltrosVistaSection({ filtros, onChange, prestadores, conDocumentacion = false }: Props) {
  const [busquedaSocio, setBusquedaSocio] = useState("");

  const set = <K extends keyof FiltrosVista>(key: K, value: FiltrosVista[K]) =>
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
            <CampoFecha
              value={filtros.fecha_desde ?? ""}
              onChange={(valor) => set("fecha_desde", valor || undefined)}
            />
          </div>
          <div className={s.filterField}>
            <label className={s.filterLabel}>Fecha hasta</label>
            <CampoFecha
              value={filtros.fecha_hasta ?? ""}
              onChange={(valor) => set("fecha_hasta", valor || undefined)}
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

        {conDocumentacion && (
          <div className={s.filterField}>
            <label className={s.filterLabel}>Documentación</label>
            <select
              className={s.filterSelect}
              value={filtros.documentacion ?? ""}
              onChange={(e) => set("documentacion", (e.target.value || undefined) as FiltroDocumentacion | undefined)}
            >
              <option value="">Todas</option>
              <option value="con">Con documentos</option>
              <option value="falta">Falta documentación</option>
              <option value="no_requiere">No la requiere</option>
            </select>
          </div>
        )}

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
              <BotonPlano
                key={t}
                type="button"
                className={`${s.chipToggle} ${(filtros.tipos ?? []).includes(t) ? s.chipToggleOn : ""}`}
                onClick={() => toggleTipo(t)}
              >
                {t}
              </BotonPlano>
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
                    <BotonPlano type="button" className={s.chipRemove} onClick={() => toggleSocio(cod)}>×</BotonPlano>
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
