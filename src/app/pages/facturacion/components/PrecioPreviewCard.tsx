import React from "react";
import type { PrecioResponse } from "../types";
import { formatMoney } from "../money";

interface Props {
  precio: PrecioResponse;
}

const PrecioPreviewCard: React.FC<Props> = ({ precio }) => (
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

    {precio.descripcion && (
      <p style={{ fontSize: 12, color: "#475569", margin: 0 }}>{precio.descripcion}</p>
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
        }}
      >
        ⚠ {precio.motivo}
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
