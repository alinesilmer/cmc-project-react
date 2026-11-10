import React, { useEffect, useState } from "react";
import { getInforme } from "@/app/pages/Pagos/pagos.api";
import { useAppSnackbar } from "@/app/hooks/useAppSnackbar";
import Button from "@/app/components/ui/Button/Button";
import styles from "./tabs.module.scss";
import type { Pago } from "../../types";
import { detalleDeError } from "@/app/shared/lib/httpErrors";

type InformeMedico = {
  medico_id: number;
  nro_socio: number | null;
  nombre: string;
  cuit: string | null;
  cbu: string | null;
  medio_cobro: string | null;
  neto_a_pagar: string;
  motivo: string | null;
};

type Resumen = Record<string, { cantidad: number; total: string }>;

type InformeResponse = {
  pago_id: number;
  tipo: string;
  total_neto: string;
  cantidad: number;
  medicos: InformeMedico[];
  resumen: Resumen;
};

type InformeTipo = "santander" | "santander_30" | "otros_bancos" | "otros_bancos_30" | "cheques" | "observados";

type Boton = { tipo: InformeTipo; label: string; ayuda: string };

// Cada socio con neto > 0 sale en UN solo archivo. Las CUIT que empiezan con 30 van aparte, sin repetirse en el de su banco.
const BOTONES: Boton[] = [
  { tipo: "santander", label: "Santander", ayuda: "Transferencia a CBU de Santander" },
  { tipo: "santander_30", label: "Santander CUIT 30", ayuda: "Santander, CUIT que empieza con 30" },
  { tipo: "otros_bancos", label: "Otros bancos", ayuda: "Transferencia a CBU de otro banco" },
  { tipo: "otros_bancos_30", label: "Otros bancos CUIT 30", ayuda: "Otros bancos, CUIT que empieza con 30" },
  { tipo: "cheques", label: "Cheques", ayuda: "Listado de quienes cobran con cheque" },
  { tipo: "observados", label: "Observados", ayuda: "No se les puede transferir: falta un CBU o un CUIT válido" },
];

const pesos = (v: string | number) =>
  Number(v).toLocaleString("es-AR", { style: "currency", currency: "ARS" });

function hoyDDMMYYYY(): string {
  const d = new Date();
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
}

// El banco recibe el nombre sin tildes, sin comillas dobles y sin punto y coma.
function nombreParaBanco(nombre: string): string {
  return (nombre ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/"/g, "'")
    .replace(/;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const importe = (v: string) => Number(v).toFixed(2);

// Mismo formato que el archivo que genera el sistema anterior y que el banco ya acepta:
//   "T";;"APELLIDO NOMBRE";"CUIT";"20XXXXXXXXX";dd/mm/aaaa;1234.56;"<CBU de 22 dígitos>";
function csvTransferencias(medicos: InformeMedico[]): string {
  const fecha = hoyDDMMYYYY();
  return (
    medicos
      .map(
        (m) =>
          `"T";;"${nombreParaBanco(m.nombre)}";"CUIT";"${m.cuit ?? ""}";${fecha};${importe(m.neto_a_pagar)};"${m.cbu ?? ""}";`
      )
      .join("\r\n") + "\r\n"
  );
}

const celda = (v: string | number | null | undefined) => `"${String(v ?? "").replace(/"/g, '""')}"`;

// Listados para leer (no van al banco): cheques y observados.
function csvListado(medicos: InformeMedico[], conMotivo: boolean): string {
  const cab = ["N° socio", "Nombre", "CUIT", "Importe", ...(conMotivo ? ["Motivo"] : [])];
  const filas = medicos.map((m) => [
    m.nro_socio ?? "",
    m.nombre,
    m.cuit ?? "",
    importe(m.neto_a_pagar),
    ...(conMotivo ? [m.motivo ?? ""] : []),
  ]);
  // BOM para que Excel respete las tildes.
  return "﻿" + [cab, ...filas].map((f) => f.map(celda).join(";")).join("\r\n") + "\r\n";
}

function descargar(contenido: string, nombreArchivo: string): void {
  const blob = new Blob([contenido], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nombreArchivo;
  a.click();
  URL.revokeObjectURL(url);
}

type Props = { pago: Pago; pagoId: number };

const TabExportables: React.FC<Props> = ({ pago, pagoId }) => {
  const notify = useAppSnackbar();
  const [busy, setBusy] = useState<InformeTipo | null>(null);
  const [resumen, setResumen] = useState<Resumen | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  // El resumen (cuántos hay en cada archivo) viene en cualquier respuesta del informe.
  useEffect(() => {
    let vivo = true;
    setAviso(null);
    getInforme<InformeResponse>(pagoId, "observados")
      .then((r) => vivo && setResumen(r.resumen))
      .catch((e) => vivo && setAviso(detalleDeError(e, "No se pudo leer el resumen de los archivos.")));
    return () => {
      vivo = false;
    };
  }, [pagoId, pago.estado]);

  const handleExport = async ({ tipo, label }: Boton) => {
    setBusy(tipo);
    try {
      const data = await getInforme<InformeResponse>(pagoId, tipo);
      setResumen(data.resumen);
      if (!data.medicos.length) {
        notify(`No hay socios en «${label}».`, "warning");
        return;
      }
      const periodo = `${String(pago.mes).padStart(2, "0")}${pago.anio}`;
      const nombreArchivo = `${periodo}_pago${pagoId}_${tipo}.csv`;
      const contenido =
        tipo === "cheques" ? csvListado(data.medicos, false)
        : tipo === "observados" ? csvListado(data.medicos, true)
        : csvTransferencias(data.medicos);
      descargar(contenido, nombreArchivo);
      notify(`${label}: ${data.cantidad} socio(s), total ${pesos(data.total_neto)}.`);
    } catch (e) {
      notify(detalleDeError(e, "Error al generar el archivo."), "error");
    } finally {
      setBusy(null);
    }
  };

  const observados = resumen?.observados?.cantidad ?? 0;

  return (
    <div className={styles.tabWrap}>
      {aviso && <p>{aviso}</p>}
      {observados > 0 && (
        <p role="alert">
          Hay {observados} socio(s) a los que no se les puede transferir ({pesos(resumen?.observados?.total ?? 0)}): falta un
          CBU o un CUIT válido. Bajá «Observados» para ver el motivo de cada uno.
        </p>
      )}
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 8 }}>
        {BOTONES.map((b) => {
          const r = resumen?.[b.tipo];
          return (
            <Button
              key={b.tipo}
              variant="secondary"
              onClick={() => handleExport(b)}
              disabled={busy !== null || !!aviso}
              title={b.ayuda}
            >
              {busy === b.tipo ? "Generando…" : r ? `${b.label} (${r.cantidad} · ${pesos(r.total)})` : b.label}
            </Button>
          );
        })}
      </div>
    </div>
  );
};

export default TabExportables;
