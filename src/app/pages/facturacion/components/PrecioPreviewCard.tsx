import React from "react";
import type { PrecioResponse } from "../types";
import { formatMoney } from "../money";

interface Props {
  precio: PrecioResponse;
  onVolverATradicional?: () => void;
}

const PrecioPreviewCard: React.FC<Props> = ({ precio, onVolverATradicional }) => (
  <div
    style={{
      border: "1px solid #e2e8f0",
      borderRadius: 8,
      padding: "12px 16px",
      background: "#f8fafc",
      display: "flex",
      flexDirection: "column",
      gap: 8,
    }}
  >
    <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
      <div>
        <span style={{ fontSize: 11, color: "#64748b", display: "block" }}>Honorarios</span>
        <strong style={{ fontSize: 14 }}>{formatMoney(precio.honorarios)}</strong>
      </div>
      <div>
        <span style={{ fontSize: 11, color: "#64748b", display: "block" }}>Gastos</span>
        <strong style={{ fontSize: 14 }}>{formatMoney(precio.gastos)}</strong>
      </div>
      <div>
        <span style={{ fontSize: 11, color: "#64748b", display: "block" }}>Ayudante</span>
        <strong style={{ fontSize: 14 }}>{formatMoney(precio.ayudante)}</strong>
      </div>
    </div>

    {(precio.descripcion || (precio.via === "L" && precio.admitido)) && (
      <p style={{ fontSize: 12, color: "#475569", margin: 0, display: "flex", alignItems: "center", gap: 8 }}>
        {precio.descripcion}
        {precio.via === "L" && precio.admitido && (
          <span
            style={{
              background: "#e0e7ff",
              color: "#3730a3",
              borderRadius: 999,
              padding: "2px 8px",
              fontSize: 11,
              fontWeight: 600,
            }}
          >
            Laparoscópica
            {precio.nivel_cotizado != null && ` · Nivel ${precio.nivel_cotizado}`}
          </span>
        )}
      </p>
    )}

    {!precio.admitido && precio.motivo && (
      <div
        style={{
          background: "#fffbeb",
          border: "1px solid #f59e0b",
          borderRadius: 6,
          padding: "8px 12px",
          fontSize: 12,
          color: "#92400e",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
        }}
      >
        <span>⚠ {precio.motivo}</span>
        {precio.via === "L" && onVolverATradicional && (
          <button
            type="button"
            onClick={onVolverATradicional}
            style={{
              background: "none",
              border: "1px solid #92400e",
              borderRadius: 4,
              padding: "2px 8px",
              fontSize: 11,
              color: "#92400e",
              cursor: "pointer",
              whiteSpace: "nowrap",
            }}
          >
            Volver a Tradicional
          </button>
        )}
      </div>
    )}

    {precio.por_presupuesto && (
      <div
        style={{
          background: "#eff6ff",
          border: "1px solid #93c5fd",
          borderRadius: 6,
          padding: "8px 12px",
          fontSize: 12,
          color: "#1e40af",
        }}
      >
        ℹ Este código requiere carga manual del importe (por presupuesto).
      </div>
    )}
  </div>
);

export default PrecioPreviewCard;
