import React, { useEffect, useState } from "react";
import { Receipt } from "lucide-react";

import { useAppSnackbar } from "@/app/hooks/useAppSnackbar";
import { listarPeriodosPropios, listarPrestaciones } from "../api";
import { detailMessage } from "../types";
import type { PeriodoPropio, PrestacionRead } from "../types";
import TablaPorObraSocial from "../components/TablaPorObraSocial";
import Franja from "@/app/components/layout/Franja/Franja";
import styles from "./MiRecepcion.module.scss";
import { comoErrorApi } from "@/app/shared/lib/httpErrors";
import BotonPlano from "@/app/components/ui/BotonPlano/BotonPlano";

// Mismo tope que "detalle-medico": el backend pagina de a 200 (GET /prestaciones: limit <= 200), esto es sólo un freno de seguridad.
const PAGE_LIMIT = 200;
const MAX_FILAS = 5000;
const MAX_PILDORAS = 6;

const MiRecepcion: React.FC = () => {
  const notify = useAppSnackbar();

  const [periodos, setPeriodos] = useState<PeriodoPropio[] | null>(null);
  const [periodoElegido, setPeriodoElegido] = useState<string>("");
  const [rows, setRows] = useState<PrestacionRead[]>([]);
  const [cargandoPeriodos, setCargandoPeriodos] = useState(true);
  const [cargandoDetalle, setCargandoDetalle] = useState(false);

  // Al montar: qué períodos tienen algo publicado.
  useEffect(() => {
    let cancelado = false;
    setCargandoPeriodos(true);
    listarPeriodosPropios()
      .then((lista) => {
        if (cancelado) return;
        setPeriodos(lista);
        if (lista.length > 0) setPeriodoElegido(lista[0].periodo);
      })
      .catch((e: unknown) => {
        if (cancelado) return;
        notify(detailMessage(comoErrorApi(e).response?.data?.detail) || "No pudimos traer tus períodos.", "error");
        setPeriodos([]);
      })
      .finally(() => {
        if (!cancelado) setCargandoPeriodos(false);
      });
    return () => { cancelado = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Detalle del período elegido — todo lo publicado, en cualquier obra social (la ownership del backend ya lo acota al médico logueado).
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
      } catch (e) {
        const err = comoErrorApi(e);
        if (!cancelado) {
          notify(detailMessage(err?.response?.data?.detail) || "No pudimos traer el detalle.", "error");
          setRows([]);
        }
      } finally {
        if (!cancelado) setCargandoDetalle(false);
      }
    })();
    return () => { cancelado = true; };
  }, [periodoElegido, notify]);

  const hayPeriodos = !cargandoPeriodos && periodos && periodos.length > 0;
  // Con muchos períodos, píldoras para los más recientes y el resto en una lista.
  const recientes = periodos?.slice(0, MAX_PILDORAS) ?? [];
  const anteriores = periodos?.slice(MAX_PILDORAS) ?? [];

  return (
    <div className={styles.container}>
      <Franja titulo="Mi recepción" icono={Receipt} />

      {hayPeriodos && (
        <div className={styles.periodos} role="group" aria-label="Período">
          {recientes.map((p) => (
            <BotonPlano
              key={p.periodo}
              type="button"
              aria-pressed={periodoElegido === p.periodo}
              className={`${styles.periodo} ${periodoElegido === p.periodo ? styles.periodoActivo : ""}`}
              onClick={() => setPeriodoElegido(p.periodo)}
            >
              {p.periodo_label}
            </BotonPlano>
          ))}
          {anteriores.length > 0 && (
            <select
              className={styles.anteriores}
              value={anteriores.some((p) => p.periodo === periodoElegido) ? periodoElegido : ""}
              onChange={(e) => e.target.value && setPeriodoElegido(e.target.value)}
              aria-label="Períodos anteriores"
            >
              <option value="">Anteriores…</option>
              {anteriores.map((p) => (
                <option key={p.periodo} value={p.periodo}>{p.periodo_label}</option>
              ))}
            </select>
          )}
        </div>
      )}

      {cargandoPeriodos && (
        <div className={styles.emptyState}>
          <p className={styles.emptyText}>Cargando tus períodos…</p>
        </div>
      )}

      {!cargandoPeriodos && periodos && periodos.length === 0 && (
        <div className={styles.emptyState}>
          <span className={styles.emptyIcon}><Receipt size={28} /></span>
          <p className={styles.emptyTextStrong}>Todavía no tenés nada publicado.</p>
          <p className={styles.emptyText}>Cuando el Colegio publique un período, lo vas a ver acá.</p>
        </div>
      )}

      {hayPeriodos && <TablaPorObraSocial prestaciones={rows} cargando={cargandoDetalle} />}
    </div>
  );
};

export default MiRecepcion;
