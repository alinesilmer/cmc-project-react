import React from "react";
import type { EstadoPrestacion } from "../types";
import { ESTADO_LABEL } from "../constants";
import paleta from "@/app/styles/paleta.module.scss";

const CHIP_STYLES: Record<EstadoPrestacion, React.CSSProperties> = {
  A: { background: paleta.tonoAmarillo50D, color: paleta.tonoNaranja550 },
  C: { background: paleta.tonoVerde50C, color: paleta.successGreen },
  L: { background: paleta.secondaryBlue, color: paleta.primaryBlueDarker },
  X: { background: paleta.gray200, color: paleta.gray600, textDecoration: "line-through" },
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
