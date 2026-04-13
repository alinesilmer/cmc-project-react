"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { FileDown, Pencil, Plus, RefreshCcw, Search, X } from "lucide-react";

import styles from "./BoletinConsultaComun.module.scss";
import Button from "../../components/atoms/Button/Button";

import {
  CONSULTA_COMUN_CODE,
  moneyFormatter,
  shortDateFormatter,
} from "./boletinConsultaComun.constants";
import { generateConsultaComunPdf } from "./boletinConsultaComun.pdf";
import { useConsultaComunQuery } from "./useConsultaComunQuery";
import { useObservaciones } from "./useObservaciones";
import { formatApiDate } from "./boletinConsultaComun.helpers";

export default function BoletinConsultaComun() {
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [search, setSearch] = useState("");
  const [editingNro, setEditingNro] = useState<number | null>(null);
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

  const handleEdit = useCallback(
    (nro: number) => {
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

  /** Applies a template text to the current textarea (replaces content). */
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
    if (data.length === 0 || isGeneratingPdf) return;

    // Merge locally-stored observations into each item before generating.
    // Once the backend is wired, `observaciones` will already contain
    // server-persisted data and this merge remains valid.
    const dataWithObs = data.map((item) => ({
      ...item,
      observaciones: observaciones[item.nro]
        ? [observaciones[item.nro]]
        : item.observaciones,
    }));

    setPdfError(null);
    setIsGeneratingPdf(true);

    try {
      await generateConsultaComunPdf(dataWithObs);
    } catch (err) {
      setPdfError(
        err instanceof Error
          ? `No se pudo generar el PDF. ${err.message}`
          : "No se pudo generar el PDF."
      );
    } finally {
      setIsGeneratingPdf(false);
    }
  }, [data, observaciones, isGeneratingPdf]);

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
              disabled={
                isLoading ||
                isFetching ||
                isGeneratingPdf ||
                data.length === 0
              }
            >
              <span className={styles.buttonInner}>
                <FileDown size={16} />
                {isGeneratingPdf ? "Generando PDF..." : "Descargar PDF"}
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

        {pdfError && <div className={styles.errorBox}>{pdfError}</div>}
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

          {/* Add template input */}
          <div className={styles.addTemplateRow}>
            <input
              ref={newTemplateInputRef}
              className={styles.addTemplateInput}
              type="text"
              placeholder="Nueva plantilla…"
              value={newTemplate}
              onChange={(e) => setNewTemplate(e.target.value)}
              onKeyDown={handleNewTemplateKeyDown}
              maxLength={400}
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

                          {/* Template quick-apply chips (inline, contextual) */}
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
                            maxLength={400}
                            placeholder="Ingrese la observación… (déjela vacía para eliminarla)"
                            // eslint-disable-next-line jsx-a11y/no-autofocus
                            autoFocus
                          />

                          <div className={styles.editRowMeta}>
                            <span className={styles.charCount}>
                              {editDraft.length}/400 carácteres
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
                                {savingNro === item.nro
                                  ? "Guardando…"
                                  : "Guardar"}
                              </Button>
                            </div>
                          </div>
                        </td>
                      </tr>
                    );
                  }

                  const hasObs = Boolean(observaciones[item.nro]);

                  return (
                    <tr key={item.nro}>
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
                          <span
                            className={styles.obsBadge}
                            title={observaciones[item.nro]}
                          >
                            Sí
                          </span>
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
