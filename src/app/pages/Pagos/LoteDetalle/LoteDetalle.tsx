import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import {
  delJSON,
  getJSON,
  patchJSON,
  postJSON,
  putJSON,
} from "@/app/shared/lib/http";
import { useAppSnackbar } from "../../../hooks/useAppSnackbar";
import BackButton from "@/app/components/ui/BackButton/BackButton";
import Button from "@/app/components/ui/Button/Button";
import Franja from "@/app/components/layout/Franja/Franja";
import lq from "../Liquidacion.module.scss";
import styles from "./LoteDetalle.module.scss";
import {
  type LoteAjuste,
  type Ajuste,
  type AtencionSearchRow,
  fmt,
  mesLabel,
} from "../types";
import type ExcelJS from "exceljs";
import { saveAs } from "@/app/shared/lib/fileSaver";
import { ArrowLeftRight, X } from "lucide-react";
import Tabla from "@/app/components/ui/Tabla/Tabla";
import BotonDescarga from "@/app/components/ui/BotonDescarga/BotonDescarga";
import {
  ESTADO_TONO,
  ESTADO_URL,
  ITEMS_URL,
  ITEM_URL,
  LOTE_URL,
  estadoLabel,
} from "@/app/pages/Pagos/LoteDetalle/utiles";
import Dialogo from "@/app/components/ui/Dialogo/Dialogo";

const OBSERVACION_OPTIONS = [
  "Falta firma",
  "Falta sello",
  "Diferencia de valores",
  "Falta datos",
];
const OTRO = "__otro__";
const BUSCAR_ATENCIONES_URL = "/api/lotes/snaps/buscar_atenciones";

const transitionLabels: Record<string, string> = {
  cerrar: "Cerrar Lote",
  reabrir: "Reabrir Lote",
  en_liquidaciones: "Pasar a Liquidaciones",
  quitar: "Quitar del Pago",
};

const transitionDescriptions: Record<string, string> = {
  cerrar:
    "¿Cerrar este lote? No se podrán agregar, editar ni eliminar ajustes.",
  reabrir: "¿Reabrir este lote? Volverá al estado Abierto para editar ajustes.",
  en_liquidaciones:
    "¿Asignar este lote al pago abierto? Se vinculará al pago actual.",
  quitar: "¿Quitar este lote del pago? Volverá al estado Cerrado.",
};

type Grupo = {
  medicoId: number;
  nombre: string;
  nroSocio: number | null;
  items: Ajuste[];
  neto: number;
};

const firmado = (a: Ajuste) => (a.tipo === "d" ? -1 : 1) * Number(a.total);

const signo = (n: number) => `${n < 0 ? "−" : n > 0 ? "+" : ""}$${fmt(Math.abs(n))}`;

const detalleError = (e: any, porDefecto: string) => {
  const detail = e?.response?.data?.detail;
  return typeof detail === "string" ? detail : (e?.message ?? porDefecto);
};

const LoteDetalle: React.FC = () => {
  const { loteId } = useParams<{ loteId: string }>();
  const notify = useAppSnackbar();

  const [lote, setLote] = useState<LoteAjuste | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Barra de carga rápida (solo con el lote abierto)
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<AtencionSearchRow[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [selectedAtencion, setSelectedAtencion] =
    useState<AtencionSearchRow | null>(null);
  const [newTipo, setNewTipo] = useState<"d" | "c">("d");
  const [newHonorarios, setNewHonorarios] = useState("");
  const [newGastos, setNewGastos] = useState("");
  const [newObservacion, setNewObservacion] = useState("");
  const [newObsIsOtro, setNewObsIsOtro] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Edición en la tabla: lo que el usuario escribió y todavía no se guardó
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [savingId, setSavingId] = useState<number | null>(null);

  const [agrupar, setAgrupar] = useState(true);

  const [deleteTarget, setDeleteTarget] = useState<Ajuste | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [transitionModal, setTransitionModal] = useState<
    "cerrar" | "reabrir" | "en_liquidaciones" | "quitar" | null
  >(null);
  const [transitioning, setTransitioning] = useState(false);

  // `silencioso`: recarga después de editar sin tapar la tabla con el cargando.
  const loadLote = useCallback(
    async (silencioso = false) => {
      if (!loteId) return;
      if (!silencioso) setLoading(true);
      setError(null);
      try {
        const data = await getJSON<LoteAjuste>(LOTE_URL(loteId));
        setLote(data);
      } catch (e: any) {
        setError(e?.message || "No se pudo cargar el lote.");
      } finally {
        setLoading(false);
      }
    },
    [loteId],
  );

  useEffect(() => {
    loadLote();
  }, [loadLote]);

  const handleSelectAtencion = (row: AtencionSearchRow) => {
    setSelectedAtencion(row);
    setSearchResults([]);
    setNewHonorarios(String(row.honorarios ?? 0));
    setNewGastos(String(row.gastos ?? 0));
  };

  // Búsqueda con espera; un número que da una sola prestación la elige sola.
  useEffect(() => {
    const q = searchQuery.trim();
    if (!lote || q.length < 2 || selectedAtencion) {
      if (!selectedAtencion) setSearchResults([]);
      return;
    }
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const qs = new URLSearchParams({
          obra_social_id: String(lote.obra_social_id),
          mes_periodo: String(lote.mes_periodo),
          anio_periodo: String(lote.anio_periodo),
          q,
          limit: "50",
        });
        // Un lote de una factura sólo busca entre las prestaciones de esa factura.
        if (lote.factura_id) qs.set("factura_id", String(lote.factura_id));
        const data =
          (await getJSON<AtencionSearchRow[]>(`${BUSCAR_ATENCIONES_URL}?${qs}`)) ?? [];
        if (/^\d+$/.test(q) && data.length === 1) handleSelectAtencion(data[0]);
        else setSearchResults(data);
      } catch {
        setSearchResults([]);
      } finally {
        setSearchLoading(false);
      }
    }, 350);
    return () => {
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    };
    // handleSelectAtencion solo usa setters: no hace falta como dependencia.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery, lote, selectedAtencion]);

  const limpiarSeleccion = () => {
    setSelectedAtencion(null);
    setSearchResults([]);
    setNewHonorarios("");
    setNewGastos("");
  };

  const handleConfirm = async (ev?: React.FormEvent) => {
    ev?.preventDefault();
    if (!loteId) return;
    if (!selectedAtencion) {
      notify("Elegí una prestación: buscá por ID, nro de orden, socio o afiliado.", "error");
      return;
    }
    if (!newHonorarios || isNaN(Number(newHonorarios)) || Number(newHonorarios) < 0) {
      notify("Los honorarios deben ser un valor válido.", "error");
      return;
    }
    if (!newGastos || isNaN(Number(newGastos)) || Number(newGastos) < 0) {
      notify("Los gastos deben ser un valor válido.", "error");
      return;
    }
    if (Number(newHonorarios) === 0 && Number(newGastos) === 0) {
      notify("Honorarios y gastos no pueden ser ambos 0.", "error");
      return;
    }
    setConfirming(true);
    try {
      await postJSON(ITEMS_URL(loteId), {
        tipo: newTipo,
        id_atencion: selectedAtencion.id,
        honorarios: Number(newHonorarios),
        gastos: Number(newGastos),
        observacion: newObservacion.trim() || null,
      });
      await loadLote(true);
      // Se conservan el tipo y el motivo: se suelen cargar varios seguidos.
      setSearchQuery("");
      limpiarSeleccion();
      notify("Ajuste agregado correctamente.");
      searchInputRef.current?.focus();
    } catch (e: any) {
      notify(detalleError(e, "Error al agregar ajuste."), "error");
    } finally {
      setConfirming(false);
    }
  };

  // Guarda un cambio hecho sobre la fila (importe, tipo o motivo).
  const guardarAjuste = async (
    a: Ajuste,
    cambio: Partial<{ tipo: "d" | "c"; honorarios: number; gastos: number; observacion: string }>,
  ) => {
    if (!loteId) return;
    const honorarios = cambio.honorarios ?? Number(a.honorarios);
    const gastos = cambio.gastos ?? Number(a.gastos);
    if (honorarios === 0 && gastos === 0) {
      notify("Honorarios y gastos no pueden ser ambos 0.", "error");
      return;
    }
    setSavingId(a.id);
    try {
      await putJSON(ITEM_URL(loteId, a.id), {
        tipo: cambio.tipo ?? a.tipo,
        honorarios,
        gastos,
        observacion: cambio.observacion ?? a.observacion ?? null,
      });
      await loadLote(true);
    } catch (e: any) {
      notify(detalleError(e, "Error al guardar."), "error");
    } finally {
      setSavingId(null);
    }
  };

  const keyDraft = (a: Ajuste, campo: "honorarios" | "gastos") => `${a.id}:${campo}`;

  const quitarDraft = (key: string) =>
    setDrafts((d) => {
      const { [key]: _quitado, ...resto } = d;
      return resto;
    });

  const commitImporte = (a: Ajuste, campo: "honorarios" | "gastos") => {
    const key = keyDraft(a, campo);
    const texto = drafts[key];
    if (texto === undefined) return;
    quitarDraft(key);
    const valor = Number(texto);
    if (texto.trim() === "" || isNaN(valor) || valor < 0) {
      notify("El importe debe ser un valor válido.", "error");
      return;
    }
    if (valor === Number(a[campo])) return;
    guardarAjuste(a, { [campo]: valor });
  };

  const handleDelete = async () => {
    if (!loteId || !deleteTarget) return;
    setDeleting(true);
    try {
      await delJSON(ITEM_URL(loteId, deleteTarget.id));
      setDeleteTarget(null);
      await loadLote(true);
      notify("Ajuste eliminado.");
    } catch (e: any) {
      notify(detalleError(e, "Error al eliminar el ajuste."), "error");
    } finally {
      setDeleting(false);
    }
  };

  const handleTransition = async () => {
    if (!loteId || !transitionModal) return;
    setTransitioning(true);
    const estadoMap: Record<string, "A" | "C" | "L"> = {
      cerrar: "C",
      reabrir: "A",
      en_liquidaciones: "L",
      quitar: "C",
    };
    try {
      const res = await patchJSON<LoteAjuste>(ESTADO_URL(loteId), {
        estado: estadoMap[transitionModal],
      });
      setLote(res);
      setTransitionModal(null);
      notify(
        `Lote ${transitionLabels[transitionModal].toLowerCase()} correctamente.`,
      );
    } catch (e: any) {
      notify(detalleError(e, "Error."), "error");
    } finally {
      setTransitioning(false);
    }
  };

  const isOpen = lote?.estado === "A";
  const isClosed = lote?.estado === "C";
  const isInLiq = lote?.estado === "L";
  const editable = isOpen;
  const ajustes = lote?.ajustes ?? [];
  const periodo = lote
    ? `${mesLabel(lote.mes_periodo)} ${lote.anio_periodo}`
    : "—";

  const grupos: Grupo[] = useMemo(() => {
    if (!agrupar) {
      return [{ medicoId: 0, nombre: "", nroSocio: null, items: ajustes, neto: 0 }];
    }
    const porMedico = new Map<number, Grupo>();
    for (const a of ajustes) {
      let g = porMedico.get(a.medico_id);
      if (!g) {
        g = {
          medicoId: a.medico_id,
          nombre: a.nombre_prestador ?? `Médico ${a.medico_id}`,
          nroSocio: a.nro_socio,
          items: [],
          neto: 0,
        };
        porMedico.set(a.medico_id, g);
      }
      g.items.push(a);
      g.neto += firmado(a);
    }
    return [...porMedico.values()].sort((x, y) => x.nombre.localeCompare(y.nombre, "es"));
  }, [ajustes, agrupar]);

  const cantMedicos = useMemo(
    () => new Set(ajustes.map((a) => a.medico_id)).size,
    [ajustes],
  );
  const neto = lote ? Number(lote.total_creditos) - Number(lote.total_debitos) : 0;

  const exportExcel = async () => {
    if (!lote) return;
    const ExcelJSLib = (await import("exceljs")).default;
    const wb = new ExcelJSLib.Workbook();
    const ws = wb.addWorksheet("Ajustes");
    ws.columns = [
      { header: "Tipo", key: "tipo", width: 10 },
      { header: "ID Prestación", key: "id_atencion", width: 14 },
      { header: "Nro Orden", key: "nro_consulta", width: 14 },
      { header: "Socio", key: "socio", width: 30 },
      { header: "Código Prest.", key: "codigo_prestacion", width: 16 },
      { header: "Fecha", key: "fecha_prestacion", width: 14 },
      { header: "Afiliado", key: "nombre_afiliado", width: 26 },
      { header: "Honorarios", key: "honorarios", width: 14 },
      { header: "Gastos", key: "gastos", width: 14 },
      { header: "Total", key: "total", width: 14 },
      { header: "Observación", key: "observacion", width: 30 },
    ] as ExcelJS.Column[];
    ajustes.forEach((a) => {
      ws.addRow({
        tipo: a.tipo === "d" ? "Débito" : "Crédito",
        id_atencion: a.id_atencion ?? "—",
        nro_consulta: a.nro_consulta ?? "—",
        socio: a.nombre_prestador
          ? `${a.nro_socio ?? ""} ${a.nombre_prestador}`.trim()
          : `Médico ${a.medico_id}`,
        codigo_prestacion: a.codigo_prestacion ?? "—",
        fecha_prestacion: a.fecha_prestacion ?? "—",
        nombre_afiliado: a.nombre_afiliado ?? "—",
        honorarios: Number(a.honorarios),
        gastos: Number(a.gastos),
        total: Number(a.total),
        observacion: a.observacion ?? "",
      });
    });
    ws.getRow(1).font = { bold: true };
    const buf = await wb.xlsx.writeBuffer();
    saveAs(
      new Blob([buf], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      }),
      `lote_${loteId}_ajustes.xlsx`,
    );
  };

  const exportPDF = async () => {
    if (!lote) return;
    const { jsPDF } = await import("jspdf");
    const { default: autoTable } = await import("jspdf-autotable");
    const doc = new jsPDF({ orientation: "landscape" });
    doc.setFontSize(12);
    doc.text(`Lote ${loteId} — OS ${lote.obra_social_id} · ${periodo}`, 14, 14);
    autoTable(doc, {
      startY: 20,
      head: [
        [
          "Tipo",
          "ID prest.",
          "Nro Orden",
          "Socio",
          "Código",
          "Fecha",
          "Honorarios",
          "Gastos",
          "Total",
          "Observación",
        ],
      ],
      body: ajustes.map((a) => [
        a.tipo === "d" ? "Débito" : "Crédito",
        a.id_atencion ?? "—",
        a.nro_consulta ?? "—",
        a.nombre_prestador
          ? `${a.nro_socio ?? ""} ${a.nombre_prestador}`.trim()
          : `Médico ${a.medico_id}`,
        a.codigo_prestacion ?? "—",
        a.fecha_prestacion ?? "—",
        `$${fmt(a.honorarios)}`,
        `$${fmt(a.gastos)}`,
        `$${fmt(a.total)}`,
        a.observacion ?? "—",
      ]),
      styles: { fontSize: 9 },
      headStyles: { fillColor: [27, 86, 255] },
    });
    doc.save(`lote_${loteId}_ajustes.pdf`);
  };

  const renderImporte = (a: Ajuste, campo: "honorarios" | "gastos") => {
    if (!editable) return <span>${fmt(a[campo])}</span>;
    const key = keyDraft(a, campo);
    return (
      <input
        className={styles.cell}
        type="number"
        min="0"
        step="0.01"
        aria-label={campo === "honorarios" ? "Honorarios" : "Gastos"}
        value={drafts[key] ?? a[campo]}
        disabled={savingId === a.id}
        onChange={(e) => setDrafts((d) => ({ ...d, [key]: e.target.value }))}
        onBlur={() => commitImporte(a, campo)}
        onKeyDown={(e) => {
          if (e.key === "Enter") (e.target as HTMLInputElement).blur();
          if (e.key === "Escape") quitarDraft(key);
        }}
      />
    );
  };

  const renderFila = (a: Ajuste) => {
    const motivoEnLista = !a.observacion || OBSERVACION_OPTIONS.includes(a.observacion);
    return (
      <tr key={a.id} className={savingId === a.id ? lq.filaOcupada : undefined}>
        <td>
          {editable ? (
            <button
              type="button"
              className={`${styles.tipoBadge} ${styles.tipoCambiable} ${a.tipo === "d" ? styles.tipoD : styles.tipoC}`}
              title="Cambiar entre débito y crédito"
              disabled={savingId === a.id}
              onClick={() => guardarAjuste(a, { tipo: a.tipo === "d" ? "c" : "d" })}
            >
              {a.tipo === "d" ? "Débito" : "Crédito"}
            </button>
          ) : (
            <span className={`${styles.tipoBadge} ${a.tipo === "d" ? styles.tipoD : styles.tipoC}`}>
              {a.tipo === "d" ? "Débito" : "Crédito"}
            </span>
          )}
        </td>
        <td className={styles.numCell}>{a.id_atencion ?? <span className={lq.tenue}>—</span>}</td>
        <td className={styles.numCell}>{a.nro_consulta ?? <span className={lq.tenue}>—</span>}</td>
        {!agrupar && (
          <td>
            {a.nombre_prestador ?? <span className={lq.tenue}>Médico {a.medico_id}</span>}
            {a.nro_socio != null && <span className={lq.tenue}> #{a.nro_socio}</span>}
          </td>
        )}
        <td>{a.codigo_prestacion ?? <span className={lq.tenue}>—</span>}</td>
        <td className={styles.numCell}>{a.fecha_prestacion ?? <span className={lq.tenue}>—</span>}</td>
        <td>{a.nombre_afiliado ?? <span className={lq.tenue}>—</span>}</td>
        <td className={styles.numCell}>{renderImporte(a, "honorarios")}</td>
        <td className={styles.numCell}>{renderImporte(a, "gastos")}</td>
        <td className={`${styles.numCell} ${a.tipo === "d" ? styles.negative : styles.positive}`}>
          {a.tipo === "d" ? "−" : "+"}${fmt(a.total)}
        </td>
        <td>
          {editable ? (
            <select
              className={styles.cellSelect}
              aria-label="Motivo"
              value={a.observacion ?? ""}
              disabled={savingId === a.id}
              onChange={(e) => guardarAjuste(a, { observacion: e.target.value })}
            >
              <option value="">—</option>
              {!motivoEnLista && <option value={a.observacion!}>{a.observacion}</option>}
              {OBSERVACION_OPTIONS.map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>
          ) : (
            (a.observacion ?? <span className={lq.tenue}>—</span>)
          )}
        </td>
        {editable && (
          <td>
            <button
              type="button"
              className={lq.botonIconoPeligro}
              title="Eliminar ajuste"
              aria-label="Eliminar ajuste"
              onClick={() => setDeleteTarget(a)}
            >
              <X size={16} />
            </button>
          </td>
        )}
      </tr>
    );
  };

  const columnasTabla = 10 + (agrupar ? 0 : 1) + (editable ? 1 : 0);

  return (
    <div className={lq.pagina}>
      <Franja titulo={`Lote ${loteId}`} icono={ArrowLeftRight} lateral={<span className={lq.franjaDato}>{periodo}</span>} />
      <BackButton label="Volver" />

      {lote && (
        <div className={lq.tira}>
          <span className={`${lq.estado} ${lq[ESTADO_TONO[lote.estado] ?? "cerrado"]}`}>
            {estadoLabel(lote.estado)}
          </span>
          <div className={lq.tiraDato}>
            <span>Obra social</span>
            <b>
              #{lote.obra_social_id}
              {lote.obra_social_nombre ? ` · ${lote.obra_social_nombre}` : ""}
              {lote.nro_factura
                ? ` · Factura ${lote.nro_factura}${lote.factura_version ? ` (${lote.factura_version > 1 ? `complementaria ${lote.factura_version - 1}` : "original"})` : ""}`
                : ""}
            </b>
          </div>
          {lote.snap_origen_id && (
            <span className={lq.tiraTexto}>Corrige el lote #{lote.snap_origen_id}</span>
          )}
          {lote.pago_id && (
            <div className={lq.tiraDato}>
              <span>Pago</span>
              <b>#{lote.pago_id}</b>
            </div>
          )}
          <div className={`${lq.tiraAccion} ${lq.acciones}`}>
            {isOpen && (
              <Button variant="primary" size="md" onClick={() => setTransitionModal("cerrar")}>
                Cerrar lote
              </Button>
            )}
            {isClosed && (
              <>
                <Button variant="ghost" size="md" onClick={() => setTransitionModal("reabrir")}>
                  Reabrir
                </Button>
                <Button variant="primary" size="md" onClick={() => setTransitionModal("en_liquidaciones")}>
                  Pasar a liquidaciones
                </Button>
              </>
            )}
            {isInLiq && (
              <Button variant="danger" size="md" onClick={() => setTransitionModal("quitar")}>
                Quitar del pago
              </Button>
            )}
          </div>
        </div>
      )}

      {error && <div className={styles.errorBanner}>{error}</div>}

      {/* Barra de carga rápida: solo con el lote abierto */}
      {editable && !loading && (
        <form className={styles.barraCarga} onSubmit={handleConfirm}>
          <div className={styles.barraCampos}>
            <div className={`${styles.campo} ${styles.campoBuscar}`}>
              <label className={styles.formLabel} htmlFor="lote-buscar">
                ID de prestación, nro de orden, socio o afiliado
              </label>
              <input
                id="lote-buscar"
                ref={searchInputRef}
                className={styles.formInput}
                type="text"
                autoComplete="off"
                value={searchQuery}
                disabled={confirming}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  if (selectedAtencion) limpiarSeleccion();
                }}
              />
            </div>
            <div className={styles.campo}>
              <span className={styles.formLabel}>Tipo</span>
              <div className={styles.seg} role="group" aria-label="Tipo de ajuste">
                <button
                  type="button"
                  className={`${styles.segBtn} ${newTipo === "d" ? styles.segDebito : ""}`}
                  aria-pressed={newTipo === "d"}
                  onClick={() => setNewTipo("d")}
                  disabled={confirming}
                >
                  Débito
                </button>
                <button
                  type="button"
                  className={`${styles.segBtn} ${newTipo === "c" ? styles.segCredito : ""}`}
                  aria-pressed={newTipo === "c"}
                  onClick={() => setNewTipo("c")}
                  disabled={confirming}
                >
                  Crédito
                </button>
              </div>
            </div>
            <div className={`${styles.campo} ${styles.campoImporte}`}>
              <label className={styles.formLabel} htmlFor="lote-hon">Honorarios</label>
              <input
                id="lote-hon"
                className={styles.formInput}
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={newHonorarios}
                onChange={(e) => setNewHonorarios(e.target.value)}
                disabled={confirming}
              />
            </div>
            <div className={`${styles.campo} ${styles.campoImporte}`}>
              <label className={styles.formLabel} htmlFor="lote-gas">Gastos</label>
              <input
                id="lote-gas"
                className={styles.formInput}
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={newGastos}
                onChange={(e) => setNewGastos(e.target.value)}
                disabled={confirming}
              />
            </div>
            <div className={`${styles.campo} ${styles.campoMotivo}`}>
              <label className={styles.formLabel} htmlFor="lote-motivo">Motivo (opcional)</label>
              {newObsIsOtro ? (
                <div className={styles.motivoOtro}>
                  <input
                    id="lote-motivo"
                    className={styles.formInput}
                    type="text"
                    placeholder="Escribí el motivo…"
                    value={newObservacion}
                    onChange={(e) => setNewObservacion(e.target.value)}
                    disabled={confirming}
                    autoFocus
                  />
                  <button
                    type="button"
                    className={lq.enlace}
                    onClick={() => {
                      setNewObsIsOtro(false);
                      setNewObservacion("");
                    }}
                    disabled={confirming}
                  >
                    Volver
                  </button>
                </div>
              ) : (
                <select
                  id="lote-motivo"
                  className={styles.formInput}
                  value={newObservacion}
                  disabled={confirming}
                  onChange={(e) => {
                    if (e.target.value === OTRO) {
                      setNewObsIsOtro(true);
                      setNewObservacion("");
                    } else {
                      setNewObservacion(e.target.value);
                    }
                  }}
                >
                  <option value="">Sin motivo</option>
                  {OBSERVACION_OPTIONS.map((o) => (
                    <option key={o} value={o}>
                      {o}
                    </option>
                  ))}
                  <option value={OTRO}>Otro…</option>
                </select>
              )}
            </div>
            <Button
              type="submit"
              variant="primary"
              size="md"
              disabled={confirming || !selectedAtencion}
            >
              {confirming ? "Guardando…" : "Agregar"}
            </Button>
          </div>

          {selectedAtencion && (
            <div className={styles.resumenSel}>
              <span>
                #{selectedAtencion.id} · <b>{selectedAtencion.medico_nombre ?? "Médico sin nombre"}</b>{" "}
                #{selectedAtencion.cod_med} · Orden {selectedAtencion.nro_orden ?? "—"} · {selectedAtencion.cod_nom ?? "—"}
                {selectedAtencion.fecha_practica ? ` · ${selectedAtencion.fecha_practica}` : ""} · Afiliado{" "}
                {selectedAtencion.nom_ape_p ?? "—"} · Facturado ${fmt(selectedAtencion.honorarios)} + ${fmt(selectedAtencion.gastos)}
              </span>
              <button type="button" className={lq.enlace} onClick={limpiarSeleccion}>
                Cambiar
              </button>
            </div>
          )}

          {!selectedAtencion && searchQuery.trim().length >= 2 && (
            <div className={styles.resultados}>
              {searchLoading ? (
                <div className={styles.emptyCell}>Buscando…</div>
              ) : searchResults.length === 0 ? (
                <div className={styles.emptyCell}>
                  Sin resultados para "{searchQuery.trim()}". Solo se encuentran prestaciones ya liquidadas de este período.
                </div>
              ) : (
                <Tabla className={`${styles.table} ${styles.tableSearch}`}>
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Nro Orden</th>
                      <th>Socio</th>
                      <th>Código</th>
                      <th>Fecha</th>
                      <th>Afiliado</th>
                      <th className={styles.numCell}>Importe</th>
                    </tr>
                  </thead>
                  <tbody>
                    {searchResults.map((row) => (
                      <tr
                        key={row.id}
                        className={styles.clickableRow}
                        onClick={() => handleSelectAtencion(row)}
                      >
                        <td>{row.id}</td>
                        <td>{row.nro_orden}</td>
                        <td>
                          <div>{row.medico_nombre}</div>
                          <div className={lq.tenue}>#{row.cod_med}</div>
                        </td>
                        <td>{row.cod_nom}</td>
                        <td>{row.fecha_practica}</td>
                        <td>{row.nom_ape_p}</td>
                        <td className={styles.numCell}>${fmt(row.importe_total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </Tabla>
              )}
            </div>
          )}
        </form>
      )}

      {/* Ajustes del lote, agrupados por médico */}
      <section className={styles.tableCard}>
        <div className={styles.panelToolbar}>
          <div className={styles.totalesBarra}>
            <span className={styles.panelTitle}>
              Ajustes del lote
              {ajustes.length > 0 && <span className={styles.countBadge}>{ajustes.length}</span>}
            </span>
            {lote && ajustes.length > 0 && (
              <>
                <span className={lq.tenue}>
                  {cantMedicos} médico{cantMedicos !== 1 ? "s" : ""}
                </span>
                <b className={styles.negative}>−${fmt(lote.total_debitos)}</b>
                <b className={styles.positive}>+${fmt(lote.total_creditos)}</b>
                <b>Neto {signo(neto)}</b>
              </>
            )}
          </div>
          <div className={styles.exportActions}>
            <label className={styles.agruparLbl}>
              <input
                type="checkbox"
                checked={agrupar}
                onChange={(e) => setAgrupar(e.target.checked)}
              />
              Agrupar por médico
            </label>
            <BotonDescarga formato="pdf" onClick={exportPDF} disabled={ajustes.length === 0} />
            <BotonDescarga formato="excel" onClick={exportExcel} disabled={ajustes.length === 0} />
          </div>
        </div>
        <div className={styles.tablaScroll}>
          <Tabla className={styles.table}>
            <thead>
              <tr>
                <th>Tipo</th>
                <th>ID prest.</th>
                <th>Nro orden</th>
                {!agrupar && <th>Médico</th>}
                <th>Código</th>
                <th>Fecha</th>
                <th>Afiliado</th>
                <th className={styles.numCell}>Honorarios</th>
                <th className={styles.numCell}>Gastos</th>
                <th className={styles.numCell}>Total</th>
                <th>Motivo</th>
                {editable && <th aria-label="Acciones" />}
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={columnasTabla} className={styles.emptyCell}>Cargando…</td>
                </tr>
              )}
              {!loading && ajustes.length === 0 && (
                <tr>
                  <td colSpan={columnasTabla} className={styles.emptyCell}>Sin ajustes en este lote.</td>
                </tr>
              )}
              {!loading &&
                grupos.map((g) => (
                  <React.Fragment key={agrupar ? g.medicoId : "todos"}>
                    {agrupar && (
                      <tr className={styles.grupoFila}>
                        <td colSpan={8}>
                          {g.nombre}
                          {g.nroSocio != null && <span className={lq.tenue}> #{g.nroSocio}</span>}
                          <span className={lq.tenue}> · {g.items.length} ajuste{g.items.length !== 1 ? "s" : ""}</span>
                        </td>
                        <td className={`${styles.numCell} ${g.neto < 0 ? styles.negative : styles.positive}`}>
                          {signo(g.neto)}
                        </td>
                        <td colSpan={1 + (editable ? 1 : 0)} />
                      </tr>
                    )}
                    {g.items.map(renderFila)}
                  </React.Fragment>
                ))}
            </tbody>
          </Tabla>
        </div>
      </section>

      {deleteTarget && (
        <Dialogo
          titulo="Eliminar ajuste"
          peligro
          onClose={deleting ? undefined : () => setDeleteTarget(null)}
          acciones={
            <>
              <Button variant="secondary" onClick={() => setDeleteTarget(null)} disabled={deleting}>
                Cancelar
              </Button>
              <Button variant="danger" onClick={handleDelete} disabled={deleting}>
                {deleting ? "Eliminando…" : "Eliminar"}
              </Button>
            </>
          }
        >
          <p>
            ¿Eliminar el {deleteTarget.tipo === "d" ? "débito" : "crédito"} de{" "}
            <strong>${fmt(deleteTarget.total)}</strong>
            {deleteTarget.nombre_prestador ? ` de ${deleteTarget.nombre_prestador}` : ""}? No se puede deshacer.
          </p>
        </Dialogo>
      )}

      {transitionModal && (
        <Dialogo
          titulo={transitionLabels[transitionModal]}
          onClose={() => setTransitionModal(null)}
          acciones={
            <>
              <Button variant="secondary" onClick={() => setTransitionModal(null)} disabled={transitioning}>
                Cancelar
              </Button>
              <Button
                variant={transitionModal === "quitar" ? "danger" : "primary"}
                onClick={handleTransition}
                disabled={transitioning}
              >
                {transitioning ? "Procesando…" : "Confirmar"}
              </Button>
            </>
          }
        >
          {!transitioning && <p>{transitionDescriptions[transitionModal]}</p>}
          {transitioning && <p style={{ color: "#64748b" }}>Procesando…</p>}
        </Dialogo>
      )}
    </div>
  );
};

export default LoteDetalle;
