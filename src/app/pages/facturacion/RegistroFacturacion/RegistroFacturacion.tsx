import React, { useEffect, useRef, useState } from "react";
import { History } from "lucide-react";

import { useAppSnackbar } from "../../../hooks/useAppSnackbar";
import { listarCargaPorUsuario, listarCierresPorUsuario } from "../api";
import type { ObraSocialOption, CargaPorUsuario, CierresPorUsuario } from "../types";
import { detailMessage } from "../types";
import { formatMoney } from "../money";
import ObraSocialAutocomplete from "../components/ObraSocialAutocomplete";
import styles from "./RegistroFacturacion.module.scss";

const periodoActual = (): string => {
  const d = new Date();
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}`;
};

const RegistroFacturacion: React.FC = () => {
  const notify = useAppSnackbar();

  // ── Filtros globales: alimentan las dos secciones (carga/cierres por usuario) ──
  const [obraSocial, setObraSocial] = useState<ObraSocialOption | null>(null);
  const [periodo, setPeriodo] = useState<string>(periodoActual());
  const [desde, setDesde] = useState<string>("");
  const [hasta, setHasta] = useState<string>("");

  const codObra = obraSocial?.nro_obra_social ? String(obraSocial.nro_obra_social) : undefined;

  const handleLimpiarGlobal = () => {
    setObraSocial(null);
    setPeriodo(periodoActual());
    setDesde("");
    setHasta("");
  };

  // ── Rankings por usuario (endpoints agregados) ──────────────────────────────
  const [cargaRows, setCargaRows] = useState<CargaPorUsuario[]>([]);
  const [cargaLoading, setCargaLoading] = useState(false);
  const [cierresUsuarioRows, setCierresUsuarioRows] = useState<CierresPorUsuario[]>([]);
  const [cierresUsuarioLoading, setCierresUsuarioLoading] = useState(false);

  const rangosDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (rangosDebounce.current) clearTimeout(rangosDebounce.current);
    rangosDebounce.current = setTimeout(async () => {
      const tieneFiltro = !!periodo || (!!desde && !!hasta);
      if (!tieneFiltro) {
        setCargaRows([]);
        setCierresUsuarioRows([]);
        return;
      }

      const params = { cod_obra: codObra, periodo: periodo || undefined, desde: desde || undefined, hasta: hasta || undefined };

      setCargaLoading(true);
      try {
        const carga = await listarCargaPorUsuario(params);
        setCargaRows(carga);
      } catch (e: any) {
        notify(detailMessage(e?.response?.data?.detail) || "Error al cargar el ranking de carga por usuario.", "error");
      } finally {
        setCargaLoading(false);
      }

      setCierresUsuarioLoading(true);
      try {
        const cierres = await listarCierresPorUsuario(params);
        setCierresUsuarioRows(cierres);
      } catch (e: any) {
        notify(detailMessage(e?.response?.data?.detail) || "Error al cargar el ranking de cierres por operador.", "error");
      } finally {
        setCierresUsuarioLoading(false);
      }
    }, 300);
    return () => { if (rangosDebounce.current) clearTimeout(rangosDebounce.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [codObra, periodo, desde, hasta, notify]);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <span className={styles.headerIcon}>
          <History size={22} />
        </span>
        <div>
          <h1 className={styles.title}>Registro de Facturación</h1>
          <p className={styles.subtitle}>
            Quién cerró cada factura y cuánto carga cada operador del Colegio — no incluye
            la carga que hacen los médicos desde su propio portal.
          </p>
        </div>
      </div>

      <div className={styles.globalFilters}>
        <div className={`${styles.filterField} ${styles.filterFieldWide}`}>
          <label className={styles.filterLabel}>Obra social</label>
          <ObraSocialAutocomplete
            value={obraSocial?.nro_obra_social ?? null}
            onChange={(_, os) => setObraSocial(os)}
          />
        </div>
        <div className={styles.filterField}>
          <label className={styles.filterLabel}>Período</label>
          <input
            className={styles.input}
            type="text"
            inputMode="numeric"
            maxLength={6}
            placeholder="Ej. 202607"
            value={periodo}
            onChange={(e) => setPeriodo(e.target.value)}
          />
        </div>
        <div className={styles.filterField}>
          <label className={styles.filterLabel}>Desde</label>
          <input className={styles.input} type="date" value={desde} onChange={(e) => setDesde(e.target.value)} />
        </div>
        <div className={styles.filterField}>
          <label className={styles.filterLabel}>Hasta</label>
          <input className={styles.input} type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} />
        </div>
        <button type="button" className={styles.clearBtn} onClick={handleLimpiarGlobal}>
          Limpiar filtros
        </button>
      </div>

      {/* ── Carga por usuario ─────────────────────────────────────────────── */}
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Carga por usuario</h2>
        </div>
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr><th>#</th><th>Usuario</th><th>Prestaciones cargadas</th><th>Importe total</th></tr>
            </thead>
            <tbody>
              {cargaLoading && <tr><td colSpan={4} className={styles.loadingCell}>Cargando…</td></tr>}
              {!cargaLoading && !periodo && !(desde && hasta) && (
                <tr><td colSpan={4} className={styles.emptyCell}>Elegí un período o un rango de fechas para ver el ranking.</td></tr>
              )}
              {!cargaLoading && (periodo || (desde && hasta)) && cargaRows.length === 0 && (
                <tr><td colSpan={4} className={styles.emptyCell}>Sin cargas administrativas en este rango.</td></tr>
              )}
              {!cargaLoading && cargaRows.map((row, i) => (
                <tr key={row.usuario}>
                  <td><span className={styles.rankCell}>{i + 1}</span></td>
                  <td>
                    <div className={styles.usuarioCell}>
                      {row.nombre && <span className={styles.usuarioNombre}>{row.nombre}</span>}
                      <span className={row.nombre ? styles.usuarioCodigo : styles.usuarioNombre}>{row.usuario}</span>
                    </div>
                  </td>
                  <td>{row.cantidad_prestaciones}</td>
                  <td><span className={styles.totalCell}>{formatMoney(row.importe_total)}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Cierres por operador ──────────────────────────────────────────── */}
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Cierres por operador</h2>
        </div>
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr><th>#</th><th>Usuario</th><th>Facturas cerradas</th><th>Importe total</th></tr>
            </thead>
            <tbody>
              {cierresUsuarioLoading && <tr><td colSpan={4} className={styles.loadingCell}>Cargando…</td></tr>}
              {!cierresUsuarioLoading && !periodo && !(desde && hasta) && (
                <tr><td colSpan={4} className={styles.emptyCell}>Elegí un período o un rango de fechas para ver el ranking.</td></tr>
              )}
              {!cierresUsuarioLoading && (periodo || (desde && hasta)) && cierresUsuarioRows.length === 0 && (
                <tr><td colSpan={4} className={styles.emptyCell}>Sin cierres en este rango.</td></tr>
              )}
              {!cierresUsuarioLoading && cierresUsuarioRows.map((row, i) => (
                <tr key={row.usuario}>
                  <td><span className={styles.rankCell}>{i + 1}</span></td>
                  <td>
                    <div className={styles.usuarioCell}>
                      {row.nombre && <span className={styles.usuarioNombre}>{row.nombre}</span>}
                      <span className={row.nombre ? styles.usuarioCodigo : styles.usuarioNombre}>{row.usuario}</span>
                    </div>
                  </td>
                  <td>{row.cantidad_facturas}</td>
                  <td><span className={styles.totalCell}>{formatMoney(row.importe_total)}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default RegistroFacturacion;
