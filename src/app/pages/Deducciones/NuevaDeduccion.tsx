import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";

import Button from "../../components/atoms/Button/Button";
import Card from "../../components/atoms/Card/Card";
import AppSearchSelect, { type AppAppSearchSelectOption } from "../../components/atoms/AppSearchSelect/AppSearchSelect";
import { createDeduccion, fetchDescuentos, fetchMedicos, fetchOpenPago } from "./api";
import { useAppSnackbar } from "../../hooks/useAppSnackbar";
import { MESES, formatMoney } from "./types";
import type { DescuentoOption, MedicoOption, Pago } from "./types";
import styles from "./NuevaDeduccion.module.scss";

const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: 8 }, (_, i) => currentYear + 2 - i);

type CuotaPreview = {
  nro: number;
  mes: number;
  anio: number;
  monto: number;
};

const splitCuotas = (total: number, cuotas: number, mesInicio: number, anioInicio: number): CuotaPreview[] => {
  if (cuotas <= 0 || total <= 0) return [];
  const base = Math.floor((total / cuotas) * 100) / 100;
  const used = base * cuotas;
  const remainder = Number((total - used).toFixed(2));

  const rows: CuotaPreview[] = [];
  let month = mesInicio;
  let year = anioInicio;

  for (let i = 1; i <= cuotas; i++) {
    const isLast = i === cuotas;
    rows.push({
      nro: i,
      mes: month,
      anio: year,
      monto: isLast ? Number((base + remainder).toFixed(2)) : base,
    });
    month += 1;
    if (month > 12) {
      month = 1;
      year += 1;
    }
  }
  return rows;
};

const getErrorMessage = (e: any, fallback: string) => {
  const detail = e?.response?.data?.detail;
  if (typeof detail === "string" && detail.trim()) return detail;
  if (typeof detail?.message === "string" && detail.message.trim()) return detail.message;
  return e?.message ?? fallback;
};

const NuevaDeduccion: React.FC = () => {
  const navigate = useNavigate();
  const notify = useAppSnackbar();

  const [medicos, setMedicos] = useState<MedicoOption[]>([]);
  const [descuentos, setDescuentos] = useState<DescuentoOption[]>([]);
  const [loadingMedicos, setLoadingMedicos] = useState(false);
  const [loadingData, setLoadingData] = useState(true);

  const [openPago, setOpenPago] = useState<Pago | null>(null);

  const [medicoId, setMedicoId] = useState<number | null>(null);
  const [descuentoId, setDescuentoId] = useState<number | null>(null);
  const [montoTotal, setMontoTotal] = useState("0");
  const [cuotas, setCuotas] = useState("1");
  const [mesInicio, setMesInicio] = useState(String(new Date().getMonth() + 1));
  const [anioInicio, setAnioInicio] = useState(String(new Date().getFullYear()));
  const [pagadorId, setPagadorId] = useState<number | null>(null);

  const [pagaPorCaja, setPagaPorCaja] = useState<boolean[]>([false]);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const parsedMonto = Number(String(montoTotal).replace(",", "."));
  const parsedCuotas = Number(cuotas);
  const parsedMes = Number(mesInicio);
  const parsedAnio = Number(anioInicio);

  const preview = useMemo(
    () => splitCuotas(parsedMonto, parsedCuotas, parsedMes, parsedAnio),
    [parsedAnio, parsedCuotas, parsedMes, parsedMonto]
  );

  // Sincroniza el array paga_por_caja cuando cambia la cantidad de cuotas
  useEffect(() => {
    const count = Number.isFinite(parsedCuotas) && parsedCuotas >= 1 ? Math.round(parsedCuotas) : 1;
    setPagaPorCaja((prev) => {
      if (prev.length === count) return prev;
      if (prev.length < count) return [...prev, ...Array<boolean>(count - prev.length).fill(false)];
      return prev.slice(0, count);
    });
  }, [parsedCuotas]);

  const togglePagaPorCaja = useCallback((idx: number) => {
    setPagaPorCaja((prev) => prev.map((v, i) => (i === idx ? !v : v)));
  }, []);

  const firstInOpenPago = Boolean(
    openPago && parsedMes === openPago.mes && parsedAnio === openPago.anio
  );

  const medicoOptions = useMemo<AppSearchSelectOption[]>(
    () =>
      medicos.map((m) => ({
        id: m.id,
        label: m.nombre,
        subtitle: m.nro_socio ? `#${m.nro_socio}` : undefined,
      })),
    [medicos]
  );
  const descuentoOptions = useMemo<AppSearchSelectOption[]>(
    () => descuentos.map((d) => ({ id: d.id, label: d.nro_colegio ? `${d.nro_colegio} - ${d.nombre}` : d.nombre })),
    [descuentos]
  );

  const searchMedicos = async (q: string) => {
    setLoadingMedicos(true);
    try {
      const rows = await fetchMedicos(q);
      setMedicos(rows);
    } finally {
      setLoadingMedicos(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoadingData(true);
      try {
        const [medicosRows, descuentosRows, pago] = await Promise.all([
          fetchMedicos(""),
          fetchDescuentos(),
          fetchOpenPago(),
        ]);
        if (cancelled) return;
        setMedicos(medicosRows);
        setDescuentos(descuentosRows);
        setOpenPago(pago);
      } catch {
        if (!cancelled) setError("No se pudieron cargar médicos o descuentos.");
      } finally {
        if (!cancelled) setLoadingData(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const isValid =
    !!medicoId &&
    !!descuentoId &&
    Number.isFinite(parsedMonto) &&
    parsedMonto > 0 &&
    Number.isFinite(parsedCuotas) &&
    parsedCuotas >= 1 &&
    Number.isFinite(parsedMes) &&
    parsedMes >= 1 &&
    parsedMes <= 12 &&
    Number.isFinite(parsedAnio) &&
    parsedAnio >= 2020;

  const onSubmit = async () => {
    if (!isValid || !medicoId || !descuentoId) return;
    setCreating(true);
    setError(null);
    try {
      await createDeduccion({
        medico_id: medicoId,
        descuento_id: descuentoId,
        monto_total: Number(parsedMonto.toFixed(2)),
        mes_inicio: parsedMes,
        anio_inicio: parsedAnio,
        pagador_medico_id: pagadorId,
        cuotas: preview.map((_, i) => ({ paga_por_caja: pagaPorCaja[i] ?? false })),
      });
      notify("Deducción creada correctamente.");
      navigate("/panel/deducciones");
    } catch (e: any) {
      notify(getErrorMessage(e, "No se pudo crear la deducción."), "error");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.content}>
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
        >
          <div className={styles.header}>
            <div>
              <h1>Nueva deducción</h1>
              <p>Creación manual de deducciones cuotificadas.</p>
            </div>
            <Button variant="secondary" onClick={() => navigate("/panel/deducciones")}>
              Volver
            </Button>
          </div>

          {error && <div className={styles.errorBanner}>{error}</div>}

          <Card className={styles.formCard}>
            <div className={styles.formGrid}>
              <div className={styles.field}>
                <label>Médico</label>
                <AppSearchSelect
                  options={medicoOptions}
                  value={medicoId}
                  onChange={(id) => setMedicoId(id as number | null)}
                  onQueryChange={searchMedicos}
                  loading={loadingMedicos}
                  disabled={loadingData || creating}
                />
              </div>
              <div className={styles.field}>
                <label>Concepto de descuento</label>
                <AppSearchSelect
                  options={descuentoOptions}
                  value={descuentoId}
                  onChange={(id) => setDescuentoId(id as number | null)}
                  disabled={loadingData || creating}
                />
              </div>
              <div className={styles.field}>
                <label>Monto total</label>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={montoTotal}
                  onChange={(e) => setMontoTotal(e.target.value)}
                  disabled={creating}
                />
              </div>
              <div className={styles.field}>
                <label>Cantidad de cuotas</label>
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={cuotas}
                  onChange={(e) => setCuotas(e.target.value)}
                  disabled={creating}
                />
              </div>
              <div className={styles.field}>
                <label>Mes inicio</label>
                <select value={mesInicio} onChange={(e) => setMesInicio(e.target.value)} disabled={creating}>
                  {MESES.map((m, i) => (
                    <option key={m} value={i + 1}>
                      {i + 1} - {m}
                    </option>
                  ))}
                </select>
              </div>
              <div className={styles.field}>
                <label>Año inicio</label>
                <select value={anioInicio} onChange={(e) => setAnioInicio(e.target.value)} disabled={creating}>
                  {YEARS.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </div>
              <div className={`${styles.field} ${styles.full}`}>
                <label>Pagador (opcional)</label>
                <AppSearchSelect
                  options={medicoOptions}
                  value={pagadorId}
                  onChange={(id) => setPagadorId(id as number | null)}
                  onQueryChange={searchMedicos}
                  loading={loadingMedicos}
                  disabled={loadingData || creating}
                />
              </div>
            </div>
            <div className={styles.submitRow}>
              <Button variant="primary" onClick={onSubmit} disabled={!isValid || creating || loadingData}>
                {creating ? "Creando..." : "Confirmar"}
              </Button>
            </div>
          </Card>

          <Card className={styles.previewCard}>
            <h3>Preview de cuotas</h3>
            {firstInOpenPago && openPago && (
              <div className={styles.infoBox}>
                La cuota 1 se asignará automáticamente al pago abierto ({MESES[openPago.mes - 1]} {openPago.anio})
                y se aplicará al cerrar el pago.
              </div>
            )}
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Cuota</th>
                    <th>Período</th>
                    <th className={styles.numCell}>Monto</th>
                    <th className={styles.checkCell}>Abona por caja</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.length === 0 && (
                    <tr>
                      <td colSpan={4} className={styles.emptyCell}>
                        Ingresá monto y cuotas válidas para ver el preview.
                      </td>
                    </tr>
                  )}
                  {preview.map((row, i) => (
                    <tr key={`${row.nro}-${row.mes}-${row.anio}`}>
                      <td>{row.nro}/{parsedCuotas || 1}</td>
                      <td>{String(row.mes).padStart(2, "0")}/{row.anio}</td>
                      <td className={styles.numCell}>{formatMoney(row.monto)}</td>
                      <td className={styles.checkCell}>
                        <input
                          type="checkbox"
                          checked={pagaPorCaja[i] ?? false}
                          onChange={() => togglePagaPorCaja(i)}
                          disabled={creating}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </motion.div>
      </div>
    </div>
  );
};

export default NuevaDeduccion;
