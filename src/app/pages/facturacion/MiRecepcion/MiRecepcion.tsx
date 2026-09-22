import React, { useEffect, useState } from "react";
import { Receipt } from "lucide-react";

import { useAppSnackbar } from "../../../hooks/useAppSnackbar";
import { listarPeriodosPropios, listarPrestaciones } from "../api";
import { detailMessage } from "../types";
import type { PeriodoPropio, PrestacionRead } from "../types";
import TablaPorObraSocial from "../components/TablaPorObraSocial";
import styles from "./MiRecepcion.module.scss";

// Mismo tope que "detalle-medico": el backend pagina de a 200 (GET
// /prestaciones: limit <= 200), esto es sólo un freno de seguridad.
const PAGE_LIMIT = 200;
const MAX_FILAS = 5000;

const MiRecepcion: React.FC = () => {
  const notify = useAppSnackbar();

  const [periodos, setPeriodos] = useState<PeriodoPropio[] | null>(null);
  const [periodoElegido, setPeriodoElegido] = useState<string>("");
  const [rows, setRows] = useState<PrestacionRead[]>([]);
  const [cargandoPeriodos, setCargandoPeriodos] = useState(true);
  const [cargandoDetalle, setCargandoDetalle] = useState(false);

  // Al montar: qué períodos tienen algo publicado. Por defecto, el más
  // reciente (el backend ya los devuelve en ese orden).
  useEffect(() => {
    let cancelado = false;
    setCargandoPeriodos(true);
    listarPeriodosPropios()
      .then((lista) => {
        if (cancelado) return;
        setPeriodos(lista);
        if (lista.length > 0) setPeriodoElegido(lista[0].periodo);
      })
      .catch((e: any) => {
        if (cancelado) return;
        notify(detailMessage(e?.response?.data?.detail) || "No pudimos traer tus períodos.", "error");
        setPeriodos([]);
      })
      .finally(() => {
        if (!cancelado) setCargandoPeriodos(false);
      });
    return () => { cancelado = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Detalle del período elegido — todo lo publicado, en cualquier obra social
  // (la ownership del backend ya lo acota al médico logueado).
  useEffect(() => {
    if (!periodoElegido) {
      setRows([]);
      return;
    }
    let cancelado = false;
    setCargandoDetalle(true);
    (async () => {
      try {
        let acumulado: PrestacionRead[] = [];
        let offset = 0;
        let total = Infinity;
        while (acumulado.length < total && acumulado.length < MAX_FILAS) {
          const { data, totalCount } = await listarPrestaciones({
            periodo: periodoElegido, publicado: true, limit: PAGE_LIMIT, offset,
          });
          acumulado = acumulado.concat(data);
          total = totalCount ?? acumulado.length;
          if (data.length < PAGE_LIMIT) break;
          offset += PAGE_LIMIT;
        }
        if (!cancelado) setRows(acumulado);
      } catch (e: any) {
        if (!cancelado) {
          notify(detailMessage(e?.response?.data?.detail) || "No pudimos traer el detalle.", "error");
          setRows([]);
        }
      } finally {
        if (!cancelado) setCargandoDetalle(false);
      }
    })();
    return () => { cancelado = true; };
  }, [periodoElegido, notify]);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <span className={styles.headerIcon}>
          <Receipt size={22} />
        </span>
        <div>
          <h1 className={styles.title}>Mi recepción</h1>
          <p className={styles.subtitle}>
            Las prestaciones que el Colegio ya te publicó, agrupadas por obra social.
          </p>
        </div>
      </div>

      <div className={styles.layout}>
        {!cargandoPeriodos && periodos && periodos.length > 0 && (
          <div className={styles.toolbar}>
            <div className={styles.filterField}>
              <label className={styles.filterLabel}>Período</label>
              <select
                className={styles.select}
                value={periodoElegido}
                onChange={(e) => setPeriodoElegido(e.target.value)}
              >
                {periodos.map((p) => (
                  <option key={p.periodo} value={p.periodo}>{p.periodo_label}</option>
                ))}
              </select>
            </div>
          </div>
        )}

        {cargandoPeriodos && (
          <div className={styles.emptyState}>
            <p className={styles.emptyText}>Cargando tus períodos…</p>
          </div>
        )}

        {!cargandoPeriodos && periodos && periodos.length === 0 && (
          <div className={styles.emptyState}>
            <span className={styles.emptyIcon}><Receipt size={24} /></span>
            <p className={styles.emptyTextStrong}>Todavía no tenés nada publicado.</p>
            <p className={styles.emptyText}>
              Cuando el Colegio publique un período, vas a poder verlo acá.
            </p>
          </div>
        )}

        {!cargandoPeriodos && periodos && periodos.length > 0 && (
          <TablaPorObraSocial prestaciones={rows} cargando={cargandoDetalle} />
        )}
      </div>
    </div>
  );
};

export default MiRecepcion;
