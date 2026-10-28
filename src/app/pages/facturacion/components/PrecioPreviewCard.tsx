import React from "react";
import type { PrecioResponse } from "../types";
import { formatMoney, parseMoney } from "../money";
import { etiquetaPrecio } from "./etiquetas";
import { AlertTriangle } from "lucide-react";
import paleta from "@/app/styles/paleta.module.scss";
import BotonPlano from "@/app/components/ui/BotonPlano/BotonPlano";

interface Props {
  precio: PrecioResponse;
  onVolverATradicional?: () => void;
}

const PrecioPreviewCard: React.FC<Props> = ({ precio, onVolverATradicional }) => {
  const etiqueta = etiquetaPrecio(precio);
  return (
  <div
    style={{
      border: `1px solid ${paleta.gray200}`,
      borderRadius: 8,
      padding: "12px 16px",
      background: paleta.gray50,
      display: "flex",
      flexDirection: "column",
      gap: 8,
    }}
  >
    {/* No sólo `!precio.admitido`: con `CARGA_SIN_PRECIO=true` (dev y prod) el caso "sin valor vigente" vuelve `admitido=true` con montos en 0 para no bloquear la carga. */}
    {precio.motivo && (
      <div
        style={{
          background: paleta.tonoAmarillo50C,
          border: `1px solid ${paleta.warningOrange}`,
          borderRadius: 6,
          padding: "8px 12px",
          fontSize: 12,
          color: paleta.tonoNaranja550,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
        }}
      >
        <span><AlertTriangle size={14} style={{ verticalAlign: "-2px" }} aria-hidden="true" /> {precio.motivo}</span>
        {precio.via === "L" && onVolverATradicional && (
          <BotonPlano
            type="button"
            onClick={onVolverATradicional}
            style={{
              background: "none",
              border: `1px solid ${paleta.tonoNaranja550}`,
              borderRadius: 4,
              padding: "2px 8px",
              fontSize: 11,
              color: paleta.tonoNaranja550,
              cursor: "pointer",
              whiteSpace: "nowrap",
            }}
          >
            Volver a Tradicional
          </BotonPlano>
        )}
      </div>
    )}

    <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
      <div>
        <span style={{ fontSize: 11, color: paleta.gray500, display: "block" }}>Honorarios</span>
        <strong style={{ fontSize: 14 }}>{formatMoney(precio.honorarios)}</strong>
      </div>
      <div>
        <span style={{ fontSize: 11, color: paleta.gray500, display: "block" }}>Gastos</span>
        <strong style={{ fontSize: 14 }}>{formatMoney(precio.gastos)}</strong>
      </div>
      <div>
        <span style={{ fontSize: 11, color: paleta.gray500, display: "block" }}>Ayudante</span>
        <strong style={{ fontSize: 14 }}>{formatMoney(precio.ayudante)}</strong>
      </div>
      {parseMoney(precio.coseguro) > 0 && (
        <div>
          <span style={{ fontSize: 11, color: paleta.gray500, display: "block" }}>Coseguro sugerido</span>
          <strong style={{ fontSize: 14 }}>{formatMoney(precio.coseguro)}</strong>
        </div>
      )}
    </div>

    {(precio.descripcion || etiqueta || (precio.via === "L" && precio.admitido)) && (
      <p style={{ fontSize: 12, color: paleta.gray600, margin: 0, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        {precio.descripcion}
        {etiqueta && (
          <span
            style={{
              background: paleta.tonoGris50,
              color: paleta.tonoVerde550,
              border: `1px solid ${paleta.tonoVerde50B}`,
              borderRadius: 999,
              padding: "2px 8px",
              fontSize: 11,
              fontWeight: 600,
            }}
            title="De dónde sale el precio"
          >
            {etiqueta}
          </span>
        )}
        {precio.via === "L" && precio.admitido && (
          <span
            style={{
              background: paleta.tonoAzul50B,
              color: paleta.tonoVioleta600,
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

    {precio.por_presupuesto && (
      <div
        style={{
          background: paleta.tonoAzul50C,
          border: `1px solid ${paleta.tonoAzul200}`,
          borderRadius: 6,
          padding: "8px 12px",
          fontSize: 12,
          color: paleta.tonoAzul600,
        }}
      >
        ℹ Este código requiere carga manual del importe (por presupuesto).
      </div>
    )}
  </div>
  );
};

export default PrecioPreviewCard;
