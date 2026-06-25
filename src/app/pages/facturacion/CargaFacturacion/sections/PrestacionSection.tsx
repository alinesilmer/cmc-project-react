import React from "react";
import NomencladorAutocomplete from "../../components/NomencladorAutocomplete";
import PrecioPreviewCard from "../../components/PrecioPreviewCard";
import type { NomencladorOption, PrecioResponse } from "../../types";
import CircularProgress from "@mui/material/CircularProgress";

interface Props {
  codNomenclador: string | null;
  onNomencladorChange: (codigo: string | null, nom: NomencladorOption | null) => void;
  precio: PrecioResponse | null;
  precioLoading: boolean;
  precioError: string | null;
  disabled?: boolean;
  errors?: Record<string, string>;
}

const PrestacionSection: React.FC<Props> = ({
  codNomenclador, onNomencladorChange, precio, precioLoading, precioError,
  disabled, errors = {},
}) => (
  <section>
    <h3 style={{ fontSize: "0.86rem", fontWeight: 600, color: "#0c2a52", borderTop: "1px solid #e2e8f0", paddingTop: 12, marginBottom: 12 }}>
      Prestación
    </h3>
    <div style={{ display: "flex", flexDirection: "column", gap: 12, maxWidth: 420 }}>
      <div>
        <label style={{ fontSize: 13, fontWeight: 500, display: "block", marginBottom: 4 }}>
          Código *
          {precioLoading && <CircularProgress size={12} style={{ marginLeft: 8 }} />}
        </label>
        <NomencladorAutocomplete
          value={codNomenclador}
          onChange={onNomencladorChange}
          disabled={disabled}
        />
        {errors.codNomenclador && (
          <span style={{ fontSize: 12, color: "#cc2a2a", display: "block", marginTop: 4 }}>
            {errors.codNomenclador}
          </span>
        )}
      </div>

      {precioError && <div style={{ fontSize: 12, color: "#cc2a2a" }}>{precioError}</div>}
      {precio && !precioLoading && <PrecioPreviewCard precio={precio} />}
    </div>
  </section>
);

export default PrestacionSection;
