import React, { useState } from "react";
import ObraSocialAutocomplete from "../components/ObraSocialAutocomplete";
import Button from "../../../components/atoms/Button/Button";
import type { ListarPrestacionesParams, EstadoPrestacion, Tipo } from "../types";
import type { ObraSocialOption } from "../types";

interface Props {
  filtros: ListarPrestacionesParams;
  onFiltrosChange: (f: ListarPrestacionesParams) => void;
  obraSocial: ObraSocialOption | null;
  onObraSocialChange: (nro: number | null, os: ObraSocialOption | null) => void;
  disabled?: boolean;
}

const ESTADOS: Array<{ value: EstadoPrestacion | ""; label: string }> = [
  { value: "", label: "Todos" },
  { value: "A", label: "Abierto" },
  { value: "C", label: "Cerrado" },
  { value: "L", label: "Legacy" },
  { value: "X", label: "Anulado" },
];

const TIPOS: Array<{ value: Tipo | ""; label: string }> = [
  { value: "", label: "Todos los tipos" },
  { value: "Consulta", label: "Consulta" },
  { value: "Practica", label: "Práctica" },
  { value: "Honorarios individuales", label: "Honorarios individuales" },
  { value: "Sanatorio", label: "Sanatorio" },
];

const FiltrosPanel: React.FC<Props> = ({ filtros, onFiltrosChange, obraSocial, onObraSocialChange, disabled }) => {
  const [expanded, setExpanded] = useState(false);

  const set = (patch: Partial<ListarPrestacionesParams>) =>
    onFiltrosChange({ ...filtros, ...patch, offset: 0 });

  return (
    <div style={{ background: "#fff", borderBottom: "1px solid #e2e8f0", padding: "12px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        <div style={{ minWidth: 220 }}>
          <ObraSocialAutocomplete
            value={obraSocial?.nro_obra_social ?? null}
            onChange={onObraSocialChange}
            disabled={disabled}
          />
        </div>
        <input
          type="text"
          placeholder="Período (ej. 202606)"
          value={filtros.periodo ?? ""}
          onChange={(e) => set({ periodo: e.target.value || undefined })}
          disabled={disabled}
          style={{ width: 130 }}
        />
        <select
          value={filtros.estado ?? ""}
          onChange={(e) => set({ estado: (e.target.value as EstadoPrestacion) || undefined })}
          disabled={disabled}
          style={{ width: 130 }}
        >
          {ESTADOS.map((e) => (
            <option key={e.value} value={e.value}>{e.label}</option>
          ))}
        </select>
        <select
          value={filtros.tipo ?? ""}
          onChange={(e) => set({ tipo: (e.target.value as Tipo) || undefined })}
          disabled={disabled}
          style={{ width: 180 }}
        >
          {TIPOS.map((t) => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>
        <input
          type="text"
          placeholder="Buscar libre…"
          value={filtros.q ?? ""}
          onChange={(e) => set({ q: e.target.value || undefined })}
          disabled={disabled}
          style={{ width: 200 }}
        />
        <Button variant="ghost" size="sm" onClick={() => setExpanded((p) => !p)}>
          {expanded ? "▲ Menos filtros" : "▼ Más filtros"}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onFiltrosChange({ limit: filtros.limit, offset: 0 })}
          disabled={disabled}
        >
          Limpiar
        </Button>
      </div>

      {expanded && (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <input
            type="text"
            placeholder="Nº orden"
            value={filtros.nro_orden ?? ""}
            onChange={(e) => set({ nro_orden: e.target.value || undefined })}
            disabled={disabled}
            style={{ width: 120 }}
          />
          <input
            type="text"
            placeholder="Código nomenclador"
            value={filtros.cod_nomenclador ?? ""}
            onChange={(e) => set({ cod_nomenclador: e.target.value || undefined })}
            disabled={disabled}
            style={{ width: 160 }}
          />
          <input
            type="text"
            placeholder="DNI paciente"
            value={filtros.dni_paciente ?? ""}
            onChange={(e) => set({ dni_paciente: e.target.value || undefined })}
            disabled={disabled}
            style={{ width: 120 }}
          />
          <input
            type="text"
            placeholder="Nombre paciente"
            value={filtros.nombre_paciente ?? ""}
            onChange={(e) => set({ nombre_paciente: e.target.value || undefined })}
            disabled={disabled}
            style={{ width: 160 }}
          />
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <label style={{ fontSize: 12, color: "#64748b" }}>Desde</label>
            <input
              type="date"
              value={filtros.fecha_desde ?? ""}
              onChange={(e) => set({ fecha_desde: e.target.value || undefined })}
              disabled={disabled}
              style={{ width: 140 }}
            />
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <label style={{ fontSize: 12, color: "#64748b" }}>Hasta</label>
            <input
              type="date"
              value={filtros.fecha_hasta ?? ""}
              onChange={(e) => set({ fecha_hasta: e.target.value || undefined })}
              disabled={disabled}
              style={{ width: 140 }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default FiltrosPanel;
