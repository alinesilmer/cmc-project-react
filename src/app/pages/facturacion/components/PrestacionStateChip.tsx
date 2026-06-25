import React from "react";
import type { EstadoPrestacion } from "../types";
import { ESTADO_LABEL } from "../constants";

const CHIP_STYLES: Record<EstadoPrestacion, React.CSSProperties> = {
  A: { background: "#fef3c7", color: "#92400e" },
  C: { background: "#dcfce7", color: "#1d9148" },
  L: { background: "#e8f0ff", color: "#0c2a52" },
  X: { background: "#e2e8f0", color: "#475569", textDecoration: "line-through" },
};

interface Props {
  estado: EstadoPrestacion;
}

const PrestacionStateChip: React.FC<Props> = ({ estado }) => (
  <span
    aria-label={ESTADO_LABEL[estado]}
    style={{
      display: "inline-block",
      padding: "2px 8px",
      borderRadius: "10px",
      fontSize: "0.72rem",
      fontWeight: 600,
      ...CHIP_STYLES[estado],
    }}
  >
    {ESTADO_LABEL[estado]}
  </span>
);

export default PrestacionStateChip;
