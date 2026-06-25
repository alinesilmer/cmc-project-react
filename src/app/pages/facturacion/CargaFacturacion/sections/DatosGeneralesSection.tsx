import React from "react";
import ObraSocialAutocomplete from "../../components/ObraSocialAutocomplete";
import PeriodoBadge from "../../components/PeriodoBadge";
import type { ObraSocialOption, PeriodoActivoResponse } from "../../types";

interface Props {
  obraSocial: ObraSocialOption | null;
  onObraSocialChange: (nro: number | null, os: ObraSocialOption | null) => void;
  periodo: PeriodoActivoResponse | null;
  periodoError: string | null;
  disabled?: boolean;
}

const DatosGeneralesSection: React.FC<Props> = ({
  obraSocial, onObraSocialChange, periodo, periodoError, disabled,
}) => (
  <section>
    <h3 style={{ fontSize: "0.86rem", fontWeight: 600, color: "#0c2a52", borderTop: "1px solid #e2e8f0", paddingTop: 12, marginBottom: 12 }}>
      Datos generales
    </h3>
    <div style={{ display: "flex", flexDirection: "column", gap: 12, maxWidth: 420 }}>
      <div>
        <label style={{ fontSize: 13, fontWeight: 500, display: "block", marginBottom: 4 }}>
          Obra social *
        </label>
        <ObraSocialAutocomplete
          value={obraSocial?.nro_obra_social ?? null}
          onChange={onObraSocialChange}
          disabled={disabled}
        />
      </div>
      <div>
        <label style={{ fontSize: 13, fontWeight: 500, display: "block", marginBottom: 4 }}>
          Período activo
        </label>
        {periodo ? (
          <PeriodoBadge label={periodo.periodo_label} />
        ) : (
          <span style={{ fontSize: 13, color: "#94a3b8" }}>— (seleccioná una obra social)</span>
        )}
      </div>
      {periodoError && (
        <div style={{ background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: 6, padding: "8px 12px", fontSize: 13, color: "#cc2a2a" }}>
          ⚠ {periodoError}
        </div>
      )}
    </div>
  </section>
);

export default DatosGeneralesSection;
