import React, { useState } from "react";
import { getJSON } from "../../../../lib/http";
import { useAppSnackbar } from "../../../../hooks/useAppSnackbar";
import Button from "../../../../components/atoms/Button/Button";
import styles from "./tabs.module.scss";
import type { Pago } from "../../types";

const INFORME_URL = (pagoId: number, tipo: string) => `/api/pagos/${pagoId}/informe/${tipo}`;

type InformeMedico = {
  medico_id: number;
  nro_socio: number;
  nombre: string;
  cuit: string | null;
  cbu: string | null;
  cuenta_bancaria: string | null;
  neto_a_pagar: string;
};

type InformeResponse = {
  pago_id: number;
  tipo: string;
  total_neto: string;
  cantidad: number;
  medicos: InformeMedico[];
};

type InformeTipo = "santander" | "otros_bancos" | "cuit_30" | "cheques";

const BOTONES: { tipo: InformeTipo; label: string; filename: string }[] = [
  { tipo: "santander",    label: "Santander",    filename: "informe_santander" },
  { tipo: "otros_bancos", label: "Otros bancos", filename: "informe_otros_bancos" },
  { tipo: "cuit_30",      label: "CUIT 30",      filename: "informe_cuit_30" },
  { tipo: "cheques",      label: "Cheques",      filename: "informe_cheques" },
];

function todayDDMMYYYY(): string {
  const d = new Date();
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = String(d.getFullYear());
  return `${dd}/${mm}/${yyyy}`;
}

function generarCSV(medicos: InformeMedico[], filename: string): void {
  const fechaHoy = todayDDMMYYYY();
  const lines = medicos.map((m) =>
    [
      "T",
      "",
      (m.nombre ?? "").slice(0, 20),
      "CUIT",
      m.cuit ?? "",
      fechaHoy,
      parseFloat(m.neto_a_pagar),
      m.cbu ?? "",
    ].join(";")
  );

  const blob = new Blob([lines.join("\r\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${filename}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

type Props = { pago: Pago; pagoId: number };

const TabExportables: React.FC<Props> = ({ pagoId }) => {
  const notify = useAppSnackbar();
  const [busy, setBusy] = useState<InformeTipo | null>(null);

  const handleExport = async (tipo: InformeTipo, filename: string) => {
    setBusy(tipo);
    try {
      const data = await getJSON<InformeResponse>(INFORME_URL(pagoId, tipo));
      if (!data.medicos.length) {
        notify("No hay médicos en este informe.", "warning");
        return;
      }
      generarCSV(data.medicos, filename);
      notify(`CSV generado: ${data.cantidad} médico(s), total $${data.total_neto}.`);
    } catch (e: any) {
      notify(e?.response?.data?.detail ?? e?.message ?? "Error al generar el informe.", "error");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className={styles.tabWrap}>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 8 }}>
        {BOTONES.map(({ tipo, label, filename }) => (
          <Button
            key={tipo}
            variant="secondary"
            onClick={() => handleExport(tipo, filename)}
            disabled={busy !== null}
          >
            {busy === tipo ? "Generando…" : label}
          </Button>
        ))}
      </div>
    </div>
  );
};

export default TabExportables;
