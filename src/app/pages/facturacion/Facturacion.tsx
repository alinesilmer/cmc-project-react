import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";

import Card from "../../components/atoms/Card/Card";
import Button from "../../components/atoms/Button/Button";
import { fetchRecientes, fetchPeriodoActivo } from "./api";
import type { ObraSocialOption, PrestacionRead } from "./types";
import { formatMoney } from "./money";
import { FACTURACION_ULTIMA_OS_KEY } from "./constants";
import PeriodoBadge from "./components/PeriodoBadge";
import PrestacionStateChip from "./components/PrestacionStateChip";
import ObraSocialAutocomplete from "./components/ObraSocialAutocomplete";
import ImporteDisplay from "./components/ImporteDisplay";
import styles from "./Facturacion.module.scss";

const Facturacion: React.FC = () => {
  const navigate = useNavigate();

  const [obraSocial, setObraSocial] = useState<ObraSocialOption | null>(() => {
    try {
      const raw = localStorage.getItem(FACTURACION_ULTIMA_OS_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  });
  const [periodoLabel, setPeriodoLabel] = useState<string | null>(null);
  const [recientes, setRecientes] = useState<PrestacionRead[]>([]);
  const [loadingRecientes, setLoadingRecientes] = useState(false);

  const loadDashboard = async (os: ObraSocialOption) => {
    setLoadingRecientes(true);
    try {
      const [periodo, rows] = await Promise.all([
        fetchPeriodoActivo(String(os.nro_obra_social)).catch(() => null),
        fetchRecientes(String(os.nro_obra_social)),
      ]);
      if (periodo) setPeriodoLabel(periodo.periodo_label);
      setRecientes(rows);
    } catch {
      // silenciar
    } finally {
      setLoadingRecientes(false);
    }
  };

  useEffect(() => {
    if (obraSocial) loadDashboard(obraSocial);
  }, []);

  const handleObraSocialChange = (_: number | null, os: ObraSocialOption | null) => {
    setObraSocial(os);
    setPeriodoLabel(null);
    setRecientes([]);
    if (os) {
      localStorage.setItem(FACTURACION_ULTIMA_OS_KEY, JSON.stringify(os));
      loadDashboard(os);
    }
  };

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1>Facturación</h1>
        {periodoLabel && <PeriodoBadge label={periodoLabel} />}
        {obraSocial && (
          <span style={{ fontSize: 13, background: "rgba(255,255,255,0.15)", padding: "2px 10px", borderRadius: 12 }}>
            {obraSocial.nro_obra_social} · {obraSocial.nombre}
          </span>
        )}
      </header>

      <motion.div
        className={styles.body}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
      >
        <div className={styles.cardsGrid}>
          <Card className={styles.card} hoverable onClick={() => navigate("/panel/facturacion/carga")}>
            <h2>🩺 Cargar prestación</h2>
            <p>Alta individual o de equipo quirúrgico. Autocomplete de médico, código y paciente.</p>
            <Button variant="primary" size="sm" onClick={(e) => { e.stopPropagation(); navigate("/panel/facturacion/carga"); }}>
              + Nueva carga
            </Button>
          </Card>

          <Card className={styles.card} hoverable onClick={() => navigate("/panel/facturacion/prestaciones")}>
            <h2>🔎 Buscar prestaciones</h2>
            <p>Filtros, edición, anulación y mover entre períodos.</p>
            <Button variant="secondary" size="sm" onClick={(e) => { e.stopPropagation(); navigate("/panel/facturacion/prestaciones"); }}>
              Ver listado
            </Button>
          </Card>

          <Card className={styles.card} hoverable onClick={() => navigate("/panel/facturacion/cierre")}>
            <h2>🔒 Cerrar período</h2>
            <p>Genera la factura y habilita las prestaciones para liquidación.</p>
            <Button variant="danger" size="sm" onClick={(e) => { e.stopPropagation(); navigate("/panel/facturacion/cierre"); }}>
              Ir a cierre
            </Button>
          </Card>
        </div>

        {!obraSocial ? (
          <div className={styles.osSelector}>
            <p>Elegí una obra social para ver tu actividad reciente.</p>
            <ObraSocialAutocomplete value={null} onChange={handleObraSocialChange} />
          </div>
        ) : (
          <section className={styles.recentSection}>
            <h2>Últimas prestaciones cargadas</h2>
            <div style={{ marginBottom: 12 }}>
              <ObraSocialAutocomplete
                value={obraSocial.nro_obra_social}
                onChange={handleObraSocialChange}
              />
            </div>
            <div className={styles.tableWrap}>
              <table>
                <thead>
                  <tr>
                    <th>Período</th>
                    <th>Médico</th>
                    <th>Código</th>
                    <th>Paciente</th>
                    <th>Importe</th>
                    <th>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {loadingRecientes && (
                    <tr><td colSpan={6} className={styles.emptyCell}>Cargando…</td></tr>
                  )}
                  {!loadingRecientes && recientes.length === 0 && (
                    <tr><td colSpan={6} className={styles.emptyCell}>Sin prestaciones recientes.</td></tr>
                  )}
                  {!loadingRecientes && recientes.map((p) => (
                    <tr key={p.id}>
                      <td>{p.periodo}</td>
                      <td>{p.cod_medico}</td>
                      <td>{p.cod_nomenclador ?? "—"}</td>
                      <td>{p.nombre_paciente ?? p.dni_paciente ?? "—"}</td>
                      <td><ImporteDisplay value={p.importe_total} /></td>
                      <td>{p.estado ? <PrestacionStateChip estado={p.estado} /> : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </motion.div>
    </div>
  );
};

export default Facturacion;
