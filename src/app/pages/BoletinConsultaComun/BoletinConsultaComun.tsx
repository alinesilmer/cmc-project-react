"use client";

import { Fragment, useCallback, useMemo, useRef, useState } from "react";
import { FileDown, Pencil, Plus, RefreshCcw, Search, X } from "lucide-react";

import styles from "./BoletinConsultaComun.module.scss";
import Button from "../../components/atoms/Button/Button";

import {
  CONSULTA_COMUN_CODE,
  moneyFormatter,
  shortDateFormatter,
} from "./boletinConsultaComun.constants";
import { generateConsultaComunPdf } from "./boletinConsultaComun.pdf";
import { generateConsultaComunExcel } from "./boletinConsultaComun.excel";
import { useConsultaComunQuery } from "./useConsultaComunQuery";
import { useGalenoQuery } from "./useGalenoQuery";
import { useObservaciones } from "./useObservaciones";
import { formatApiDate } from "./boletinConsultaComun.helpers";
import type { GalenoValues } from "./boletinConsultaComun.types";

const ZERO_GALENO: GalenoValues = {
  quirurgico: 0,
  practica: 0,
  radiologico: 0,
  cirugiaAdultos: 0,
  cirugiaInfantil: 0,
  gastosQuirurgicos: 0,
  gastosRadiologico: 0,
  gastosBioquimicos: 0,
  otrosGastos: 0,
};

type ObsLine =
  | { type: "header"; label: string; body: string }
  | { type: "text"; body: string };

function parseObsLines(raw: string): ObsLine[] {
  const cleaned = raw
    .replace(/^[\s)?(|\\[\]{}]+/, "")
    .replace(/[\s)?(|\\[\]{}]+$/, "")
    .trim();

  if (!cleaned) return [];

  return cleaned
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .map((line): ObsLine => {
      const colonIdx = line.indexOf(":");
      if (colonIdx > 2 && colonIdx < line.length - 1) {
        const before = line.slice(0, colonIdx).trim();
        const after = line.slice(colonIdx + 1).trim();
        const letters = (before.match(/[a-záéíóúüñA-ZÁÉÍÓÚÜÑ]/g) ?? []).length;
        const uppers = (before.match(/[A-ZÁÉÍÓÚÜÑ]/g) ?? []).length;
        if (letters > 0 && uppers / letters >= 0.55 && before.length >= 3) {
          return { type: "header", label: before, body: after };
        }
      }
      return { type: "text", body: line };
    });
}

export default function BoletinConsultaComun() {
  const [exportError, setExportError] = useState<string | null>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [isGeneratingExcel, setIsGeneratingExcel] = useState(false);
  const [search, setSearch] = useState("");
  const [editingNro, setEditingNro] = useState<number | null>(null);
  const [viewingObsNro, setViewingObsNro] = useState<number | null>(null);
  const [editDraft, setEditDraft] = useState("");
  const [newTemplate, setNewTemplate] = useState("");
  const newTemplateInputRef = useRef<HTMLInputElement>(null);

  const {
    data = [],
    error,
    isLoading,
    isFetching,
    refetch,
  } = useConsultaComunQuery();

  const { data: galenoMap } = useGalenoQuery();

  const {
    observaciones,
    saveObservacion,
    savingNro,
    templates,
    addTemplate,
    removeTemplate,
    isSavingTemplate,
  } = useObservaciones();

  const filteredItems = useMemo(
    () =>
      data.filter(
        (item) =>
          !search.trim() ||
          item.nombre.toLowerCase().includes(search.toLowerCase()) ||
          String(item.nro).includes(search.trim())
      ),
    [data, search]
  );

  /** Items with real observations + real GALENO values — used only for PDF/Excel. */
  const dataForExport = useMemo(
    () =>
      data.map((item) => ({
        ...item,
        observaciones: observaciones[item.nro]
          ? [observaciones[item.nro]]
          : item.observaciones,
        galeno: galenoMap?.get(item.nro) ?? ZERO_GALENO,
      })),
    [data, observaciones, galenoMap]
  );

  const handleEdit = useCallback(
    (nro: number) => {
      setViewingObsNro(null);
      setEditingNro(nro);
      setEditDraft(observaciones[nro] ?? "");
    },
    [observaciones]
  );

  const handleSave = useCallback(
    async (nro: number) => {
      await saveObservacion(nro, editDraft);
      setEditingNro(null);
    },
    [saveObservacion, editDraft]
  );

  const handleCancelEdit = useCallback(() => {
    setEditingNro(null);
    setEditDraft("");
  }, []);

  const handleToggleObsView = useCallback((nro: number) => {
    setViewingObsNro((prev) => (prev === nro ? null : nro));
  }, []);

  const handleApplyTemplate = useCallback((texto: string) => {
    setEditDraft(texto);
  }, []);

  const handleAddTemplate = useCallback(async () => {
    const text = newTemplate.trim();
    if (!text) return;
    await addTemplate(text);
    setNewTemplate("");
    newTemplateInputRef.current?.focus();
  }, [addTemplate, newTemplate]);

  const handleNewTemplateKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") void handleAddTemplate();
    },
    [handleAddTemplate]
  );

  const handleDownloadPdf = useCallback(async () => {
    if (dataForExport.length === 0 || isGeneratingPdf) return;
    setExportError(null);
    setIsGeneratingPdf(true);
    try {
      await generateConsultaComunPdf(dataForExport);
    } catch (err) {
      setExportError(
        err instanceof Error
          ? `No se pudo generar el PDF. ${err.message}`
          : "No se pudo generar el PDF."
      );
    } finally {
      setIsGeneratingPdf(false);
    }
  }, [dataForExport, isGeneratingPdf]);

  const handleDownloadExcel = useCallback(async () => {
    if (dataForExport.length === 0 || isGeneratingExcel) return;
    setExportError(null);
    setIsGeneratingExcel(true);
    try {
      await generateConsultaComunExcel(dataForExport, observaciones);
    } catch (err) {
      setExportError(
        err instanceof Error
          ? `No se pudo generar el Excel. ${err.message}`
          : "No se pudo generar el Excel."
      );
    } finally {
      setIsGeneratingExcel(false);
    }
  }, [dataForExport, observaciones, isGeneratingExcel]);

  return (
    <div className={styles.container}>
      {/* ── Summary panel ── */}
      <section className={styles.panel}>
        <div className={styles.panelTop}>
          <div>
            <h2 className={styles.panelTitle}>Vista previa</h2>
            <p className={styles.panelDescription}>
              El PDF siempre se genera con <strong>todas</strong> las obras
              sociales disponibles para el código{" "}
              <strong>{CONSULTA_COMUN_CODE}</strong>.
            </p>
          </div>

          <div className={styles.actions}>
            <Button
              size="md"
              variant="secondary"
              onClick={() => void refetch()}
              disabled={isLoading || isFetching || isGeneratingPdf}
            >
              <span className={styles.buttonInner}>
                <RefreshCcw size={16} />
                Actualizar datos
              </span>
            </Button>

            <Button
              size="md"
              variant="danger"
              onClick={() => void handleDownloadPdf()}
              disabled={isLoading || isFetching || isGeneratingPdf || data.length === 0}
            >
              <span className={styles.buttonInner}>
                <FileDown size={16} />
                {isGeneratingPdf ? "Generando PDF..." : "Descargar PDF"}
              </span>
            </Button>

            <Button
              size="md"
              variant="ghost"
              onClick={() => void handleDownloadExcel()}
              disabled={isLoading || isFetching || isGeneratingExcel || data.length === 0}
            >
              <span className={styles.buttonInner}>
                <FileDown size={16} />
                {isGeneratingExcel ? "Generando Excel..." : "Descargar Excel"}
              </span>
            </Button>
          </div>
        </div>

        <div className={styles.metaGrid}>
          <div className={styles.metaCard}>
            <span className={styles.metaLabel}>Práctica</span>
            <span className={styles.metaValue}>Consulta Común</span>
          </div>
          <div className={styles.metaCard}>
            <span className={styles.metaLabel}>Código</span>
            <span className={styles.metaValue}>{CONSULTA_COMUN_CODE}</span>
          </div>
          <div className={styles.metaCard}>
            <span className={styles.metaLabel}>Obras sociales</span>
            <span className={styles.metaValue}>{data.length}</span>
          </div>
          <div className={styles.metaCard}>
            <span className={styles.metaLabel}>Fecha del documento</span>
            <span className={styles.metaValue}>
              {shortDateFormatter.format(new Date())}
            </span>
          </div>
        </div>

        {exportError && <div className={styles.errorBox}>{exportError}</div>}
      </section>

      {/* ── Observations panel ── */}
      <section className={styles.panel}>
        <div className={styles.panelTop}>
          <div>
            <h2 className={styles.panelTitle}>Observaciones por obra social</h2>
            <p className={styles.panelDescription}>
              Agregue observaciones individuales o reutilice plantillas
              compartidas. El texto se incluirá en la página del PDF de cada
              obra social.
            </p>
          </div>
        </div>

        {/* ── Templates manager ── */}
        <div className={styles.templatesSection}>
          <p className={styles.templatesLabel}>
            Plantillas reutilizables
            <span className={styles.templatesHint}>
              — haga clic en una para aplicarla al campo en edición
            </span>
          </p>

          <div className={styles.templatesRow}>
            {templates.map((tpl) => (
              <span key={tpl.id} className={styles.templateChip}>
                <button
                  className={styles.templateChipText}
                  onClick={() => handleApplyTemplate(tpl.texto)}
                  disabled={editingNro === null}
                  title={
                    editingNro === null
                      ? "Abra una obra social para editar primero"
                      : `Aplicar: ${tpl.texto}`
                  }
                >
                  {tpl.texto}
                </button>
                <button
                  className={styles.templateChipRemove}
                  onClick={() => void removeTemplate(tpl.id)}
                  title="Eliminar plantilla"
                  aria-label={`Eliminar plantilla: ${tpl.texto}`}
                >
                  <X size={12} />
                </button>
              </span>
            ))}
            {templates.length === 0 && (
              <span className={styles.templatesEmpty}>
                Sin plantillas. Agregue una observación de uso frecuente.
              </span>
            )}
          </div>

          <div className={styles.addTemplateRow}>
            <input
              ref={newTemplateInputRef}
              className={styles.addTemplateInput}
              type="text"
              placeholder="Nueva plantilla…"
              value={newTemplate}
              onChange={(e) => setNewTemplate(e.target.value)}
              onKeyDown={handleNewTemplateKeyDown}
              maxLength={1000}
              disabled={isSavingTemplate}
            />
            <button
              className={styles.addTemplateBtn}
              onClick={() => void handleAddTemplate()}
              disabled={!newTemplate.trim() || isSavingTemplate}
              title="Agregar plantilla"
            >
              <Plus size={16} />
              Agregar
            </button>
          </div>
        </div>

        {/* ── Search bar ── */}
        <div className={styles.searchBar}>
          <Search className={styles.searchIcon} size={18} />
          <input
            className={styles.searchInput}
            type="search"
            placeholder="Buscar obra social por nombre o número…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {isLoading && (
          <div className={styles.loadingBox}>
            <span className={styles.loader} />
            Cargando obras sociales…
          </div>
        )}

        {error && !isLoading && (
          <div className={styles.errorBox}>
            No se pudieron cargar los datos. Intente actualizar.
          </div>
        )}

        {!isLoading && !error && data.length === 0 && (
          <div className={styles.emptyBox}>
            No hay datos disponibles. Use "Actualizar datos" para cargar las
            obras sociales.
          </div>
        )}

        {!isLoading && data.length > 0 && filteredItems.length === 0 && (
          <div className={styles.emptyBox}>
            Sin resultados para "{search}".
          </div>
        )}

        {!isLoading && filteredItems.length > 0 && (
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th className={styles.colNumber}>N°</th>
                  <th>Obra Social</th>
                  <th className={styles.colAmount}>Valor</th>
                  <th className={styles.colDate}>Últ. cambio</th>
                  <th className={styles.colObs}>Obs.</th>
                  <th className={styles.colAction} />
                </tr>
              </thead>
              <tbody>
                {filteredItems.map((item) => {
                  if (editingNro === item.nro) {
                    return (
                      <tr key={item.nro}>
                        <td colSpan={6} className={styles.editRowCell}>
                          <p className={styles.editRowLabel}>
                            Editando:{" "}
                            <strong>
                              {item.nombre} (N° {item.nro})
                            </strong>
                          </p>

                          {templates.length > 0 && (
                            <div className={styles.inlineTemplates}>
                              <span className={styles.inlineTemplatesLabel}>
                                Plantillas:
                              </span>
                              {templates.map((tpl) => (
                                <button
                                  key={tpl.id}
                                  className={styles.inlineTemplateChip}
                                  onClick={() => handleApplyTemplate(tpl.texto)}
                                  title={`Aplicar: ${tpl.texto}`}
                                >
                                  {tpl.texto}
                                </button>
                              ))}
                            </div>
                          )}

                          <textarea
                            className={styles.obsTextarea}
                            value={editDraft}
                            onChange={(e) => setEditDraft(e.target.value)}
                            maxLength={1000}
                            placeholder="Ingrese la observación… (déjela vacía para eliminarla)"
                            // eslint-disable-next-line jsx-a11y/no-autofocus
                            autoFocus
                          />

                          <div className={styles.editRowMeta}>
                            <span className={styles.charCount}>
                              {editDraft.length}/1000 carácteres
                            </span>
                            <div className={styles.editRowActions}>
                              <Button
                                size="md"
                                variant="secondary"
                                onClick={handleCancelEdit}
                                disabled={savingNro === item.nro}
                              >
                                Cancelar
                              </Button>
                              <Button
                                size="md"
                                variant="primary"
                                onClick={() => void handleSave(item.nro)}
                                disabled={savingNro === item.nro}
                              >
                                {savingNro === item.nro ? "Guardando…" : "Guardar"}
                              </Button>
                            </div>
                          </div>
                        </td>
                      </tr>
                    );
                  }

                  const hasObs = Boolean(observaciones[item.nro]);
                  const isViewingObs = viewingObsNro === item.nro;

                  return (
                    <Fragment key={item.nro}>
                      <tr>
                        <td className={styles.numberCell}>{item.nro}</td>
                        <td className={styles.nameCell}>{item.nombre}</td>
                        <td className={styles.amountCell}>
                          {moneyFormatter.format(item.valor)}
                        </td>
                        <td className={styles.dateCell}>
                          {formatApiDate(item.fechaCambio)}
                        </td>
                        <td className={styles.obsCell}>
                          {hasObs ? (
                            <button
                              className={`${styles.obsBadge} ${isViewingObs ? styles.obsBadgeActive : ""}`}
                              onClick={() => handleToggleObsView(item.nro)}
                              disabled={editingNro !== null}
                              title={isViewingObs ? "Cerrar observación" : "Ver observación"}
                            >
                              {isViewingObs ? "Cerrar" : "Ver"}
                            </button>
                          ) : (
                            <span className={styles.obsBadgeEmpty}>—</span>
                          )}
                        </td>
                        <td className={styles.actionCell}>
                          <button
                            className={styles.editIconBtn}
                            onClick={() => handleEdit(item.nro)}
                            title="Editar observación"
                            disabled={editingNro !== null}
                          >
                            <Pencil size={15} />
                          </button>
                        </td>
                      </tr>

                      {isViewingObs && hasObs && (
                        <tr>
                          <td colSpan={6} className={styles.obsViewCell}>
                            <div className={styles.obsViewInner}>
                              <div className={styles.obsViewToolbar}>
                                <span className={styles.obsViewTitle}>
                                  Observación · {item.nombre}
                                </span>
                                <button
                                  className={styles.obsViewEditBtn}
                                  onClick={() => handleEdit(item.nro)}
                                >
                                  <Pencil size={13} />
                                  Editar
                                </button>
                              </div>

                              <div className={styles.obsBlock}>
                                {parseObsLines(observaciones[item.nro] ?? "").map(
                                  (line, i) =>
                                    line.type === "header" ? (
                                      <div key={i} className={styles.obsItem}>
                                        <span className={styles.obsItemHeader}>
                                          {line.label}
                                        </span>
                                        <span className={styles.obsItemBody}>
                                          {line.body}
                                        </span>
                                      </div>
                                    ) : (
                                      <div key={i} className={styles.obsItemPlain}>
                                        <span className={styles.obsItemBody}>
                                          {line.body}
                                        </span>
                                      </div>
                                    )
                                )}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
