import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";

import Button from "../../../components/atoms/Button/Button";
import { useAppSnackbar } from "../../../hooks/useAppSnackbar";
import { crearPrestaciones, fetchRecientes } from "../api";
import { detailMessage } from "../types";
import type { ObraSocialOption, AfiliadoRead, PrestacionItem, TipoCalculo, PrestacionRead } from "../types";
import { parseMoney, formatMoney } from "../money";
import { FACTURACION_ULTIMA_OS_KEY } from "../constants";

import PeriodoBadge from "../components/PeriodoBadge";
import DuplicadoConfirmModal from "../components/DuplicadoConfirmModal";

import { usePeriodoActivo } from "./hooks/usePeriodoActivo";
import { useNomencladorPrecio } from "./hooks/useNomencladorPrecio";

import MedicoSection from "./sections/MedicoSection";
import DatosGeneralesSection from "./sections/DatosGeneralesSection";
import PacienteSection from "./sections/PacienteSection";
import PrestacionSection from "./sections/PrestacionSection";
import AyudanteSection, { DEFAULT_AYUDANTE_EQUIPO, type AyudanteEquipoState } from "./sections/AyudanteSection";
import ResumenLateralCard from "./sections/ResumenLateralCard";

import styles from "./CargaFacturacion.module.scss";

const todayISO = () => new Date().toISOString().slice(0, 10);

const H3 = { fontSize: "0.86rem", fontWeight: 600, color: "#0c2a52", borderTop: "1px solid #e2e8f0", paddingTop: 12, marginBottom: 12 } as const;

type Mantener = { paciente: boolean; servicio: boolean; medico: boolean };

const CargaFacturacion: React.FC = () => {
  const navigate = useNavigate();
  const notify = useAppSnackbar();

  // Médico cabecera
  const [codMedico, setCodMedico] = useState<string | null>(null);

  // Obra social + período
  const [obraSocial, setObraSocial] = useState<ObraSocialOption | null>(null);
  const { periodo, error: periodoError, loading: periodoLoading, load: loadPeriodo, reset: resetPeriodo } = usePeriodoActivo();

  // Paciente
  const [dni, setDni] = useState("");
  const [nombrePaciente, setNombrePaciente] = useState("");

  // Fecha + clínica
  const [fechaPractica, setFechaPractica] = useState(todayISO());
  const [codClinica, setCodClinica] = useState<number | null>(null);

  // Montos principales
  const [codNomenclador, setCodNomenclador] = useState<string | null>(null);
  const [cantidad, setCantidad] = useState(1);
  const [sesion, setSesion] = useState(1);
  const [tipoCalculo, setTipoCalculo] = useState<TipoCalculo>("A");
  const [porcentaje, setPorcentaje] = useState(100);
  const [honorarios, setHonorarios] = useState("0");
  const [gastos, setGastos] = useState("0");

  // Ayudante quirúrgico
  const [ayudanteEquipo, setAyudanteEquipo] = useState<AyudanteEquipoState>(DEFAULT_AYUDANTE_EQUIPO);

  // UI
  const [mantener, setMantener] = useState<Mantener>({ paciente: false, servicio: true, medico: false });
  const [guardando, setGuardando] = useState(false);
  const [errores, setErrores] = useState<Record<string, string>>({});
  const [duplicado, setDuplicado] = useState<{ mensaje: string; id?: number } | null>(null);
  const [pendingPayload, setPendingPayload] = useState<Parameters<typeof crearPrestaciones>[0] | null>(null);
  const [recientes, setRecientes] = useState<PrestacionRead[]>([]);
  const [resetKey, setResetKey] = useState(0);

  // Precio del nomenclador
  const { precio, loading: precioLoading, error: precioError } = useNomencladorPrecio({
    codMedico,
    codObra: obraSocial ? String(obraSocial.nro_obra_social) : null,
    codigo: codNomenclador,
    fecha: fechaPractica,
  });

  // Sincronizar montos desde precio cuando cambia (modo automático)
  useEffect(() => {
    if (!precio) return;
    if (precio.por_presupuesto) {
      setTipoCalculo("M");
      return;
    }
    if (tipoCalculo === "A") {
      setHonorarios(precio.honorarios ?? "0");
      setGastos(precio.gastos ?? "0");
    }
  }, [precio]); // eslint-disable-line react-hooks/exhaustive-deps

  // Limpiar nombre cuando se borra el DNI
  useEffect(() => {
    if (dni.length < 8) setNombrePaciente("");
  }, [dni]);

  const loadRecientes = useCallback(async (codObra: string) => {
    try {
      const rows = await fetchRecientes(codObra);
      setRecientes(rows);
    } catch {
      // silenciar
    }
  }, []);

  const handleObraSocialChange = useCallback((nro: number | null, os: ObraSocialOption | null) => {
    setObraSocial(os);
    resetPeriodo();
    setCodNomenclador(null);
    if (nro && os) {
      localStorage.setItem(FACTURACION_ULTIMA_OS_KEY, JSON.stringify(os));
      loadPeriodo(String(nro));
      loadRecientes(String(nro));
    }
  }, [loadPeriodo, loadRecientes, resetPeriodo]);

  const handleMontoChange = (setter: (v: string) => void, value: string) => {
    setter(value);
    if (tipoCalculo !== "M") setTipoCalculo("M");
  };

  const totalEstimado = useMemo(() => {
    const h = parseMoney(honorarios);
    const g = parseMoney(gastos);
    const base = (h + g) * (porcentaje / 100) * cantidad * sesion;
    if (ayudanteEquipo.activo) {
      const ayAmount = ayudanteEquipo.tipoCalculo === "A"
        ? parseMoney(precio?.ayudante)
        : parseMoney(ayudanteEquipo.precioManual);
      return base + ayAmount * (ayudanteEquipo.porcentaje / 100);
    }
    return base;
  }, [honorarios, gastos, porcentaje, cantidad, sesion, ayudanteEquipo, precio]);

  const buildMainItem = (): PrestacionItem => ({
    cod_medico: codMedico!,
    dni_paciente: dni || null,
    fecha_practica: fechaPractica,
    cod_clinica: codClinica,
    cod_nomenclador: codNomenclador!,
    cantidad,
    sesion,
    tipo_calculo: tipoCalculo,
    honorarios: parseMoney(honorarios),
    gastos: parseMoney(gastos),
    ayudante: 0,
    porcentaje,
    grupo_equipo_id: null,
  });

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!obraSocial) errs.obraSocial = "Requerido";
    if (!periodo) errs.periodo = "Sin período activo";
    if (!codMedico) errs.codMedico = "Requerido";
    if (!codNomenclador) errs.codNomenclador = "Requerido";
    if (precio && !precio.admitido && tipoCalculo !== "M") {
      errs.admitido = "Código no admitido — pasá a modo Manual para forzar la carga";
    }
    if (ayudanteEquipo.activo) {
      if (!ayudanteEquipo.codMedico) {
        errs.ayudante = "Seleccioná el médico ayudante";
      } else if (ayudanteEquipo.codMedico === codMedico) {
        errs.ayudante = "El ayudante no puede ser el mismo médico principal";
      }
    }
    setErrores(errs);
    return Object.keys(errs).length === 0;
  };

  const resetForm = () => {
    setCodNomenclador(null);
    setHonorarios("0");
    setGastos("0");
    setTipoCalculo("A");
    setPorcentaje(100);
    setCantidad(1);
    setSesion(1);
    setAyudanteEquipo(DEFAULT_AYUDANTE_EQUIPO);
    if (!mantener.medico) setCodMedico(null);
    if (!mantener.paciente) { setDni(""); setNombrePaciente(""); }
    if (!mantener.servicio) {
      setFechaPractica(todayISO());
      setCodClinica(null);
    }
    setErrores({});
    setResetKey((k) => k + 1);
  };

  const doGuardar = async (confirmarDuplicado = false) => {
    if (!validate()) return;

    const mainItem = buildMainItem();
    const items: PrestacionItem[] = [mainItem];

    if (ayudanteEquipo.activo && ayudanteEquipo.codMedico) {
      const ayAmount = ayudanteEquipo.tipoCalculo === "A"
        ? parseMoney(precio?.ayudante)
        : parseMoney(ayudanteEquipo.precioManual);
      items.push({
        cod_medico: ayudanteEquipo.codMedico,
        dni_paciente: mainItem.dni_paciente,
        fecha_practica: mainItem.fecha_practica,
        cod_clinica: mainItem.cod_clinica,
        cod_nomenclador: mainItem.cod_nomenclador!,
        cantidad: 1,
        sesion: 1,
        tipo_calculo: ayudanteEquipo.tipoCalculo,
        honorarios: 0,
        gastos: 0,
        ayudante: ayAmount,
        porcentaje: ayudanteEquipo.porcentaje,
        grupo_equipo_id: null,
      });
    }

    const payload = { obra_social: String(obraSocial!.nro_obra_social), prestaciones: items };
    setGuardando(true);
    try {
      const result = await crearPrestaciones(payload, confirmarDuplicado);
      notify(`Prestación guardada — total ${result.importe_total}`);
      resetForm();
      if (obraSocial) loadRecientes(String(obraSocial.nro_obra_social));
    } catch (e: any) {
      const status = e?.response?.status;
      const detail = e?.response?.data?.detail;
      if (status === 409 && typeof detail === "object" && detail?.duplicado !== undefined) {
        setPendingPayload(payload);
        setDuplicado({ mensaje: detailMessage(detail), id: detail.duplicado });
      } else {
        notify(detailMessage(detail) || "Error al guardar", "error");
      }
    } finally {
      setGuardando(false);
    }
  };

  // Atajos de teclado
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === "Enter") { e.preventDefault(); doGuardar(); }
      if (e.ctrlKey && e.key === "l") { e.preventDefault(); resetForm(); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  });

  const canGuardar =
    !!obraSocial && !!periodo && !periodoError && !!codMedico && !!codNomenclador &&
    !guardando && !precioLoading;

  const formDisabled = !obraSocial || !!periodoError || guardando;
  const admiteAyudante = !!precio && !precioLoading && parseMoney(precio.ayudante) > 0;

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1>Carga de prestación</h1>
        {periodo && <PeriodoBadge label={periodo.periodo_label} />}
        {obraSocial && (
          <span style={{ fontSize: 13, background: "rgba(255,255,255,0.15)", padding: "2px 10px", borderRadius: 12 }}>
            OS: {obraSocial.nro_obra_social} · {obraSocial.nombre}
          </span>
        )}
        <div className={styles.headerActions}>
          <Button variant="ghost" size="sm" onClick={() => navigate("/panel/facturacion")}>
            ← Volver
          </Button>
        </div>
      </header>

      <motion.div
        className={styles.body}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div className={styles.form}>

          {/* 1. Médico cabecera */}
          <MedicoSection
            key={`medico-${resetKey}`}
            codMedico={codMedico}
            onMedicoChange={(cod) => setCodMedico(cod)}
            disabled={guardando}
            error={errores.codMedico}
          />

          {/* 2. Obra social + período */}
          <DatosGeneralesSection
            obraSocial={obraSocial}
            onObraSocialChange={handleObraSocialChange}
            periodo={periodo}
            periodoError={periodoError}
            disabled={guardando || periodoLoading}
          />

          {/* 3. Paciente */}
          <PacienteSection
            dni={dni}
            nombrePaciente={nombrePaciente}
            onDniChange={setDni}
            onAfiliadoFound={(a: AfiliadoRead) => { setDni(a.dni); setNombrePaciente(a.nombre); }}
            disabled={formDisabled}
            error={errores.dni}
          />

          {/* 4. Fecha de práctica */}
          <section>
            <h3 style={H3}>Fecha de práctica</h3>
            <input
              type="date"
              value={fechaPractica}
              onChange={(e) => setFechaPractica(e.target.value)}
              disabled={formDisabled}
              style={{ maxWidth: 180 }}
            />
          </section>

          {/* 5. Código + precio preview */}
          <PrestacionSection
            key={`nom-${resetKey}`}
            codNomenclador={codNomenclador}
            onNomencladorChange={(cod) => setCodNomenclador(cod)}
            precio={precio}
            precioLoading={precioLoading}
            precioError={precioError}
            disabled={formDisabled}
            errors={errores}
          />

          {/* 6. Clínica */}
          <section>
            <h3 style={H3}>
              Clínica (cod)
              <span style={{ fontSize: 11, color: "#94a3b8", fontWeight: 400, marginLeft: 8 }}>
                si se completa → tipo Sanatorio
              </span>
            </h3>
            <input
              type="number"
              min={1}
              value={codClinica ?? ""}
              onChange={(e) => setCodClinica(e.target.value ? Number(e.target.value) : null)}
              disabled={formDisabled}
              placeholder="— opcional —"
              style={{ maxWidth: 140 }}
            />
          </section>

          {/* 7. Sesión y cantidad */}
          <section>
            <h3 style={H3}>Cantidad y sesiones</h3>
            <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
              <div>
                <label style={{ fontSize: 13, fontWeight: 500, display: "block", marginBottom: 4 }}>Cantidad *</label>
                <input
                  type="number" min={1}
                  value={cantidad}
                  onChange={(e) => setCantidad(Math.max(1, Number(e.target.value)))}
                  disabled={formDisabled}
                  style={{ width: 80 }}
                />
              </div>
              <div>
                <label style={{ fontSize: 13, fontWeight: 500, display: "block", marginBottom: 4 }}>Sesión *</label>
                <input
                  type="number" min={1}
                  value={sesion}
                  onChange={(e) => setSesion(Math.max(1, Number(e.target.value)))}
                  disabled={formDisabled}
                  style={{ width: 80 }}
                />
              </div>
              <div>
                <label style={{ fontSize: 13, fontWeight: 500, display: "block", marginBottom: 4 }}>% Porcentaje</label>
                <input
                  type="number" min={1} max={100}
                  value={porcentaje}
                  onChange={(e) => setPorcentaje(Math.min(100, Math.max(1, Number(e.target.value))))}
                  disabled={formDisabled}
                  style={{ width: 70 }}
                />
              </div>
            </div>
          </section>

          {/* 8. Tipo de cálculo */}
          <section>
            <h3 style={H3}>Tipo de cálculo</h3>
            <div style={{ display: "flex", gap: 20 }}>
              {([["A", "Automático (lookup)"], ["M", "Manual"]] as const).map(([v, label]) => (
                <label key={v} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 13, cursor: "pointer" }}>
                  <input
                    type="radio"
                    name="tipoCalculo"
                    value={v}
                    checked={tipoCalculo === v}
                    onChange={() => setTipoCalculo(v)}
                    disabled={formDisabled}
                  />
                  {label}
                </label>
              ))}
            </div>
          </section>

          {/* 9. Honorarios y gastos */}
          <section>
            <h3 style={H3}>
              Montos
              {tipoCalculo === "M" ? (
                <span style={{ fontSize: 11, color: "#f59e0b", fontWeight: 400, marginLeft: 8 }}>Manual</span>
              ) : precio ? (
                <span style={{ fontSize: 11, color: "#94a3b8", fontWeight: 400, marginLeft: 8 }}>del lookup — editá para pasar a Manual</span>
              ) : null}
            </h3>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <div>
                <label style={{ fontSize: 11, color: "#64748b", display: "block", marginBottom: 2 }}>Honorarios</label>
                <input
                  type="number" min={0} step="0.01"
                  value={honorarios}
                  onChange={(e) => handleMontoChange(setHonorarios, e.target.value)}
                  disabled={formDisabled}
                  style={{ width: 140, background: tipoCalculo === "M" ? "#fff" : "#f8fafc" }}
                />
              </div>
              <div>
                <label style={{ fontSize: 11, color: "#64748b", display: "block", marginBottom: 2 }}>Gastos</label>
                <input
                  type="number" min={0} step="0.01"
                  value={gastos}
                  onChange={(e) => handleMontoChange(setGastos, e.target.value)}
                  disabled={formDisabled}
                  style={{ width: 140, background: tipoCalculo === "M" ? "#fff" : "#f8fafc" }}
                />
              </div>
            </div>
            <p style={{ fontSize: 11, color: "#94a3b8", margin: "6px 0 0" }}>
              Los conceptos enviados en &gt; 0 son los que se facturan.
            </p>

            {errores.admitido && (
              <div style={{ marginTop: 8, fontSize: 12, color: "#f59e0b" }}>{errores.admitido}</div>
            )}

            <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 10, padding: "8px 12px", background: "#f0f4ff", borderRadius: 6 }}>
              <span style={{ fontSize: 13, color: "#334155" }}>Total estimado:</span>
              <strong style={{ fontSize: 15, color: "#0c2a52" }}>{formatMoney(totalEstimado)}</strong>
            </div>
          </section>

          {/* 10. Agregar ayudante (solo si el código tiene componente ayudante) */}
          {admiteAyudante && (
            <AyudanteSection
              precio={precio!}
              ayudante={ayudanteEquipo}
              onChange={setAyudanteEquipo}
              codMedicoMain={codMedico}
              disabled={guardando}
              error={errores.ayudante}
            />
          )}

        </div>

        <div className={styles.sidebar}>
          <ResumenLateralCard
            totalEstimado={totalEstimado}
            recientes={recientes}
            mantener={mantener}
            onMantenerChange={(k, v) => setMantener((prev) => ({ ...prev, [k]: v }))}
          />
        </div>
      </motion.div>

      <footer className={styles.footer}>
        <Button variant="ghost" onClick={resetForm} disabled={guardando}>
          Limpiar (Ctrl+L)
        </Button>
        <Button variant="ghost" onClick={() => navigate("/panel/facturacion")} disabled={guardando}>
          Cancelar
        </Button>
        <Button
          variant="primary"
          onClick={() => doGuardar()}
          disabled={!canGuardar}
          isLoading={guardando}
        >
          {guardando ? "Guardando…" : "Guardar (Ctrl+↵)"}
        </Button>
      </footer>

      <DuplicadoConfirmModal
        isOpen={!!duplicado}
        mensaje={duplicado?.mensaje ?? ""}
        duplicadoId={duplicado?.id}
        onClose={() => { setDuplicado(null); setPendingPayload(null); }}
        onConfirm={async () => {
          setDuplicado(null);
          if (pendingPayload) {
            setGuardando(true);
            try {
              const result = await crearPrestaciones(pendingPayload, true);
              notify(`Prestación guardada — total ${result.importe_total}`);
              resetForm();
              if (obraSocial) loadRecientes(String(obraSocial.nro_obra_social));
            } catch (e: any) {
              notify(detailMessage(e?.response?.data?.detail) || "Error al guardar", "error");
            } finally {
              setGuardando(false);
              setPendingPayload(null);
            }
          }
        }}
        loading={guardando}
      />
    </div>
  );
};

export default CargaFacturacion;
