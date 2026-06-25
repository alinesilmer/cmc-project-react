import React, { useState } from "react";
import Modal from "../../../components/atoms/Modal/Modal";
import Button from "../../../components/atoms/Button/Button";
import { editarPrestacion } from "../api";
import type { PrestacionRead, PrestacionUpdate, TipoCalculo } from "../types";
import { parseMoney } from "../money";

interface Props {
  prestacion: PrestacionRead | null;
  onClose: () => void;
  onSaved: (updated: PrestacionRead) => void;
}

const EditarPrestacionModal: React.FC<Props> = ({ prestacion, onClose, onSaved }) => {
  const [cantidad, setCantidad] = useState(prestacion?.cantidad ?? 1);
  const [sesion, setSesion] = useState(prestacion?.sesion ?? 1);
  const [tipoCalculo, setTipoCalculo] = useState<TipoCalculo>("A");
  const [honorarios, setHonorarios] = useState(prestacion?.honorarios ?? "0");
  const [gastos, setGastos] = useState(prestacion?.gastos ?? "0");
  const [ayudante, setAyudante] = useState(prestacion?.ayudante ?? "0");
  const [fechaPractica, setFechaPractica] = useState(prestacion?.fecha_practica ?? "");
  const [codClinica, setCodClinica] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!prestacion) return null;

  const handleMontoChange = (setter: (v: string) => void, value: string) => {
    setter(value);
    if (tipoCalculo !== "M") setTipoCalculo("M");
  };

  const handleSave = async () => {
    setLoading(true);
    setError(null);
    const isManual = tipoCalculo === "M";
    const payload: PrestacionUpdate = {
      cantidad,
      sesion,
      tipo_calculo: tipoCalculo,
      fecha_practica: fechaPractica || null,
      cod_clinica: codClinica,
      ...(isManual ? {
        honorarios: parseMoney(honorarios),
        gastos: parseMoney(gastos),
        ayudante: parseMoney(ayudante),
      } : {}),
    };
    try {
      const updated = await editarPrestacion(prestacion.id, payload);
      onSaved(updated);
      onClose();
    } catch (e: any) {
      const detail = e?.response?.data?.detail;
      setError(typeof detail === "string" ? detail : "No se pudo guardar.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={true} onClose={onClose} title={`Editar prestación · orden #${prestacion.nro_orden ?? prestacion.id}`} size="medium">
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          <div>
            <label style={{ fontSize: 13, fontWeight: 500, display: "block", marginBottom: 4 }}>Período</label>
            <input value={prestacion.periodo} disabled style={{ background: "#f1f5f9", width: "100%" }} />
          </div>
          <div>
            <label style={{ fontSize: 13, fontWeight: 500, display: "block", marginBottom: 4 }}>Nº orden</label>
            <input value={prestacion.nro_orden ?? "—"} disabled style={{ background: "#f1f5f9", width: "100%" }} />
          </div>
          <div>
            <label style={{ fontSize: 13, fontWeight: 500, display: "block", marginBottom: 4 }}>Tipo (derivado)</label>
            <input value={prestacion.tipo ?? "—"} disabled style={{ background: "#f1f5f9", width: "100%" }} />
          </div>
          <div>
            <label style={{ fontSize: 13, fontWeight: 500, display: "block", marginBottom: 4 }}>Fecha práctica</label>
            <input type="date" value={fechaPractica} onChange={(e) => setFechaPractica(e.target.value)} disabled={loading} style={{ width: "100%" }} />
          </div>
          <div>
            <label style={{ fontSize: 13, fontWeight: 500, display: "block", marginBottom: 4 }}>
              Clínica (cod)
              <span style={{ fontSize: 11, color: "#94a3b8", marginLeft: 6 }}>si se completa → tipo Sanatorio</span>
            </label>
            <input
              type="number" min={1} value={codClinica ?? ""}
              onChange={(e) => setCodClinica(e.target.value ? Number(e.target.value) : null)}
              disabled={loading}
              placeholder="— opcional —"
              style={{ width: "100%" }}
            />
          </div>
          <div>
            <label style={{ fontSize: 13, fontWeight: 500, display: "block", marginBottom: 4 }}>Cantidad</label>
            <input type="number" min={1} value={cantidad} onChange={(e) => setCantidad(Number(e.target.value))} disabled={loading} style={{ width: "100%" }} />
          </div>
          <div>
            <label style={{ fontSize: 13, fontWeight: 500, display: "block", marginBottom: 4 }}>Sesión</label>
            <input type="number" min={1} value={sesion} onChange={(e) => setSesion(Number(e.target.value))} disabled={loading} style={{ width: "100%" }} />
          </div>
        </div>

        <div>
          <label style={{ fontSize: 13, fontWeight: 500, display: "block", marginBottom: 6 }}>Tipo cálculo</label>
          <div style={{ display: "flex", gap: 16 }}>
            {([["A", "Automático (lookup)"], ["M", "Manual"]] as const).map(([v, label]) => (
              <label key={v} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 13 }}>
                <input type="radio" checked={tipoCalculo === v} onChange={() => setTipoCalculo(v)} disabled={loading} />
                {label}
              </label>
            ))}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <label style={{ fontSize: 13, fontWeight: 500 }}>
            Montos
            {tipoCalculo === "M" && (
              <span style={{ fontSize: 11, color: "#f59e0b", marginLeft: 8, fontWeight: 400 }}>Manual — los que mandés en &gt; 0 son los que se facturan</span>
            )}
          </label>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
            <div>
              <label style={{ fontSize: 11, color: "#64748b", display: "block", marginBottom: 2 }}>Honorarios</label>
              <input
                type="number" step="0.01" value={honorarios}
                onChange={(e) => handleMontoChange(setHonorarios, e.target.value)}
                disabled={loading}
                style={{ width: "100%", background: tipoCalculo === "M" ? "#fff" : "#f8fafc" }}
              />
            </div>
            <div>
              <label style={{ fontSize: 11, color: "#64748b", display: "block", marginBottom: 2 }}>Gastos</label>
              <input
                type="number" step="0.01" value={gastos}
                onChange={(e) => handleMontoChange(setGastos, e.target.value)}
                disabled={loading}
                style={{ width: "100%", background: tipoCalculo === "M" ? "#fff" : "#f8fafc" }}
              />
            </div>
            <div>
              <label style={{ fontSize: 11, color: "#64748b", display: "block", marginBottom: 2 }}>Ayudante</label>
              <input
                type="number" step="0.01" value={ayudante}
                onChange={(e) => handleMontoChange(setAyudante, e.target.value)}
                disabled={loading}
                style={{ width: "100%", background: tipoCalculo === "M" ? "#fff" : "#f8fafc" }}
              />
            </div>
          </div>
        </div>

        {error && <span style={{ fontSize: 12, color: "#cc2a2a" }}>{error}</span>}

        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <Button variant="ghost" onClick={onClose} disabled={loading}>Cancelar</Button>
          <Button variant="primary" onClick={handleSave} disabled={loading} isLoading={loading}>Guardar</Button>
        </div>
      </div>
    </Modal>
  );
};

export default EditarPrestacionModal;
