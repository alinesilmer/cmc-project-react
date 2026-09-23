import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  UserSearch, Search, AlertTriangle, FileSpreadsheet, FileText, Loader2,
} from "lucide-react";

import { useAppSnackbar } from "../../../hooks/useAppSnackbar";
import { listarPrestaciones, fetchMedicos, fetchMedicosTodos, descargarExportPorMedico } from "../api";
import { detailMessage } from "../types";
import type { MedicoOption, PrestacionRead, Tipo } from "../types";
import { formatMoney, parseMoney } from "../money";
import { saveAs } from "../../../lib/fileSaver";
import TablaPorObraSocial from "../components/TablaPorObraSocial";
import MedicoAutocomplete from "../components/MedicoAutocomplete";
import { dedupePorId } from "../components/localSearch";
import styles from "./DetallePorMedico.module.scss";

// Tope del backend por request (GET /prestaciones: limit <= 200) y freno de
// seguridad para no traer indefinidamente si un médico tuviera muchísimas filas.
const PAGE_LIMIT = 200;
const MAX_FILAS = 5000;

const TIPOS_ORDEN: Tipo[] = ["Consulta", "Practica", "Honorarios individuales", "Sanatorio"];
const TIPO_LABEL_CORTO: Record<Tipo, string> = {
  Consulta: "Consultas",
  Practica: "Prácticas",
  "Honorarios individuales": "Honorarios",
  Sanatorio: "Sanatorios",
};

interface Busqueda { socio: string; periodo: string; }

const DetallePorMedico: React.FC = () => {
  const navigate = useNavigate();
  const notify = useAppSnackbar();

  // Buscador de socio: por Nº de socio o por nombre (mismo `/medicos` que usa
  // el resto de facturación) — antes era un input numérico que sólo aceptaba
  // el número de socio tipeado a mano.
  // Precarga completa de médicos (igual que el formulario de carga): el formulario de
  // búsqueda no se muestra hasta tenerlos, y el autocomplete filtra en memoria.
  const [medicosPrecargados, setMedicosPrecargados] = useState<MedicoOption[] | null>(null);
  const [errorPrecarga, setErrorPrecarga] = useState(false);
  const [reintentoPrecarga, setReintentoPrecarga] = useState(0);

  useEffect(() => {
    let active = true;
    setErrorPrecarga(false);
    (async () => {
      try {
        const medicos = await fetchMedicosTodos();
        if (active) setMedicosPrecargados(dedupePorId(medicos, (m) => m.cod));
      } catch {
        if (active) setErrorPrecarga(true);
      }
    })();
    return () => { active = false; };
  }, [reintentoPrecarga]);

  const [medicoElegido, setMedicoElegido] = useState<MedicoOption | null>(null);
  const [periodoInput, setPeriodoInput] = useState("");

  const [rows, setRows] = useState<PrestacionRead[] | null>(null);
  const [medico, setMedico] = useState<MedicoOption | null>(null);
  const [busqueda, setBusqueda] = useState<Busqueda | null>(null);
  const [truncado, setTruncado] = useState(false);
  const [loading, setLoading] = useState(false);
  const [exportando, setExportando] = useState<"pdf" | "xlsx" | null>(null);

  const buscar = async () => {
    const socio = medicoElegido?.cod?.trim() ?? "";
    const periodo = periodoInput.trim();
    if (!socio || !periodo) {
      notify("Elegí un socio y completá el período.", "error");
      return;
    }
    if (!/^\d{6}$/.test(periodo)) {
      notify("El período va en formato AAAAMM (ej. 202607).", "error");
      return;
    }

    setLoading(true);
    setMedico(null);
    try {
      // Se trae todo el detalle del médico en el período (paginando en lotes de
      // 200) para poder mostrar los totales exactos, no sólo los de una página.
      let acumulado: PrestacionRead[] = [];
      let offset = 0;
      let total = Infinity;
      let corte = false;
      while (acumulado.length < total && acumulado.length < MAX_FILAS) {
        const { data, totalCount } = await listarPrestaciones({
          cod_medico: socio, periodo, limit: PAGE_LIMIT, offset,
        });
        acumulado = acumulado.concat(data);
        total = totalCount ?? acumulado.length;
        if (data.length < PAGE_LIMIT) break;
        offset += PAGE_LIMIT;
      }
      if (acumulado.length >= MAX_FILAS && acumulado.length < total) corte = true;

      acumulado.sort((a, b) => {
        const fa = a.fecha_practica ?? "";
        const fb = b.fecha_practica ?? "";
        if (fa !== fb) return fa < fb ? -1 : 1;
        return (a.id ?? 0) - (b.id ?? 0);
      });

      setRows(acumulado);
      setTruncado(corte);
      setBusqueda({ socio, periodo });

      // Nombre/matrícula del médico: se resuelve por el socio que EFECTIVAMENTE
      // trajo la consulta (el backend puede acotar al médico propio si la cuenta
      // no tiene permiso para ver a otros), así el banner nunca miente.
      const socioReal = acumulado[0]?.cod_medico ?? socio;
      try {
        const meds = await fetchMedicos(socioReal, 10);
        setMedico(meds.find((m) => String(m.cod) === String(socioReal)) ?? null);
      } catch {
        // El detalle ya se muestra igual; el nombre es un extra.
      }
    } catch (e: any) {
      notify(detailMessage(e?.response?.data?.detail) || "Error al cargar el detalle.", "error");
    } finally {
      setLoading(false);
    }
  };

  const limpiar = () => {
    setMedicoElegido(null);
    setPeriodoInput("");
    setRows(null);
    setMedico(null);
    setBusqueda(null);
    setTruncado(false);
  };

  const onKeyDown = (e: React.KeyboardEvent) => { if (e.key === "Enter") buscar(); };

  const exportar = async (formato: "pdf" | "xlsx") => {
    if (!busqueda) return;
    setExportando(formato);
    try {
      const { blob, filename } = await descargarExportPorMedico(busqueda.socio, busqueda.periodo, formato);
      await saveAs(blob, filename ?? `detalle_medico_${busqueda.socio}_${busqueda.periodo}.${formato}`);
    } catch (e: any) {
      notify(detailMessage(e?.response?.data?.detail) || "No se pudo generar el archivo.", "error");
    } finally {
      setExportando(null);
    }
  };

  const verFicha = (id: number) => navigate(`/panel/facturacion/consulta/${id}`);

  // Totales y conteos por tipo — las anuladas (estado "X") no suman.
  const resumen = useMemo(() => {
    const base = {
      vigentes: 0, anuladas: 0,
      honorarios: 0, gastos: 0, coseguro: 0, subtotal: 0,
      porTipo: {} as Record<string, number>,
    };
    if (!rows) return base;
    for (const p of rows) {
      if (p.estado === "X") { base.anuladas += 1; continue; }
      base.vigentes += 1;
      base.honorarios += parseMoney(p.honorarios);
      base.gastos += parseMoney(p.gastos);
      base.coseguro += parseMoney(p.coseguro);
      base.subtotal += parseMoney(p.importe_total);
      if (p.tipo) base.porTipo[p.tipo] = (base.porTipo[p.tipo] ?? 0) + 1;
    }
    return base;
  }, [rows]);

  const hayResultados = !!busqueda && !!rows;

  if (!medicosPrecargados) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <span className={styles.headerIcon}>
            <UserSearch size={22} />
          </span>
          <div>
            <h1 className={styles.title}>Detalle por médico</h1>
          </div>
        </div>
        {errorPrecarga ? (
          <div className={styles.emptyState}>
            <p className={styles.emptyTextStrong}>⚠ No se pudieron cargar los médicos.</p>
            <button type="button" className={styles.searchBtn} onClick={() => setReintentoPrecarga((k) => k + 1)}>
              Reintentar
            </button>
          </div>
        ) : (
          <div className={styles.emptyState}>
            <p className={styles.emptyText}>Cargando formulario, esperá…</p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <span className={styles.headerIcon}>
          <UserSearch size={22} />
        </span>
        <div>
          <h1 className={styles.title}>Detalle por médico</h1>
          <p className={styles.subtitle}>
            Todas las prestaciones de un socio en un período, en cualquier obra social.
          </p>
        </div>
      </div>

      <div className={styles.layout}>
        <div className={styles.toolbar}>
          <div className={styles.filterField} style={{ minWidth: 260 }}>
            <label className={styles.filterLabel}>Socio</label>
            <MedicoAutocomplete
              value={medicoElegido?.cod ?? null}
              onChange={(_cod, m) => setMedicoElegido(m)}
              blurOnSelect={false}
              medicosPrecargados={medicosPrecargados}
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
              value={periodoInput}
              onChange={(e) => setPeriodoInput(e.target.value)}
              onKeyDown={onKeyDown}
            />
          </div>

          <button type="button" className={styles.searchBtn} onClick={buscar} disabled={loading}>
            <Search size={16} /> {loading ? "Buscando…" : "Ver detalle"}
          </button>
          <button type="button" className={styles.clearBtn} onClick={limpiar} disabled={loading}>
            Limpiar
          </button>
        </div>

        {/* Resumen + banner del médico */}
        {hayResultados && rows!.length > 0 && (
          <div className={styles.summaryBar}>
            <div className={styles.medicoInfo}>
              <span className={styles.medicoNombre}>
                {medico?.nombre ?? `Socio ${busqueda!.socio}`}
              </span>
              <span className={styles.medicoSub}>
                Socio {medico?.cod ?? busqueda!.socio}
                {medico?.matricula != null && ` · Matrícula ${medico.matricula}`}
                {` · Período ${busqueda!.periodo}`}
              </span>
            </div>

            <span className={`${styles.chip} ${styles.chipCount}`}>
              {resumen.vigentes} prestación{resumen.vigentes !== 1 ? "es" : ""}
            </span>
            {TIPOS_ORDEN.filter((t) => resumen.porTipo[t]).map((t) => (
              <span key={t} className={styles.chip}>
                {TIPO_LABEL_CORTO[t]}: {resumen.porTipo[t]}
              </span>
            ))}
            {resumen.anuladas > 0 && (
              <span className={`${styles.chip} ${styles.chipWarn}`}>
                {resumen.anuladas} anulada{resumen.anuladas !== 1 ? "s" : ""}
              </span>
            )}
            <span className={`${styles.chip} ${styles.chipMoney}`}>
              Honorarios: {formatMoney(resumen.honorarios)}
            </span>
            <span className={`${styles.chip} ${styles.chipMoney}`}>
              Gastos: {formatMoney(resumen.gastos)}
            </span>
            {resumen.coseguro > 0 && (
              <span className={`${styles.chip} ${styles.chipMoney}`}>
                Coseguro: {formatMoney(resumen.coseguro)}
              </span>
            )}
            <span className={`${styles.chip} ${styles.chipMoney}`}>
              Total: {formatMoney(resumen.subtotal)}
            </span>

            <div className={styles.exportGroup}>
              <button
                type="button"
                className={`${styles.exportBtn} ${styles.exportBtnExcel}`}
                onClick={() => exportar("xlsx")}
                disabled={exportando !== null}
                title="Exportar a Excel"
              >
                {exportando === "xlsx"
                  ? <Loader2 size={15} className={styles.spin} />
                  : <FileSpreadsheet size={15} />}
                Excel
              </button>
              <button
                type="button"
                className={`${styles.exportBtn} ${styles.exportBtnPDF}`}
                onClick={() => exportar("pdf")}
                disabled={exportando !== null}
                title="Exportar a PDF"
              >
                {exportando === "pdf"
                  ? <Loader2 size={15} className={styles.spin} />
                  : <FileText size={15} />}
                PDF
              </button>
            </div>
          </div>
        )}

        {truncado && (
          <div className={styles.summaryBar}>
            <span className={`${styles.chip} ${styles.chipWarn}`}>
              <AlertTriangle size={13} /> Se muestran las primeras {MAX_FILAS} filas — afiná por período.
            </span>
          </div>
        )}

        {/* Estado inicial */}
        {!busqueda && !loading && (
          <div className={styles.emptyState}>
            <span className={styles.emptyIcon}><UserSearch size={24} /></span>
            <p className={styles.emptyText}>
              Buscá al socio por número o por nombre y completá el período (AAAAMM)
              para ver el detalle completo de las prestaciones de ese médico.
            </p>
          </div>
        )}

        {loading && (
          <div className={styles.emptyState}>
            <p className={styles.emptyText}>Cargando detalle…</p>
          </div>
        )}

        {/* Sin resultados */}
        {hayResultados && rows!.length === 0 && !loading && (
          <div className={styles.emptyState}>
            <span className={styles.emptyIcon}><AlertTriangle size={24} /></span>
            <p className={styles.emptyTextStrong}>
              No se encontraron prestaciones para el socio {busqueda!.socio} en el período {busqueda!.periodo}.
            </p>
            <p className={styles.emptyText}>
              Revisá el número de socio y el período (AAAAMM).
            </p>
          </div>
        )}

        {/* Tabla de detalle, agrupada por obra social */}
        {hayResultados && rows!.length > 0 && !loading && (
          <TablaPorObraSocial
            prestaciones={rows!}
            cargando={false}
            onRowClick={(p) => verFicha(p.id)}
            mostrarCodigoOS
          />
        )}
      </div>
    </div>
  );
};

export default DetallePorMedico;
