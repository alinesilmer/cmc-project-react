import React from "react";

interface Props {
  label: string;
}

const PeriodoBadge: React.FC<Props> = ({ label }) => (
  <span
    style={{
      display: "inline-flex",
      alignItems: "center",
      padding: "2px 10px",
      borderRadius: "12px",
      background: "rgba(255,255,255,0.15)",
      color: "#fff",
      fontSize: "0.76rem",
      fontWeight: 500,
      letterSpacing: "0.01em",
    }}
  >
    Período activo: {label}
  </span>
);

export default PeriodoBadge;
