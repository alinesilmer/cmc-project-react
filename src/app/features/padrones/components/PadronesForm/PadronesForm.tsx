import React, { useEffect, useMemo, useRef, useState } from "react";
import { saveAs } from "@/app/shared/lib/fileSaver";

import styles from "./PadronesForm.module.scss";
import Alert from "@/app/components/ui/Alert/Alert";

import {
  fetchObrasSociales,
  fetchPadrones,
  addPadronByOS,
  removePadronByOS,
  type ObraSocial,
  type Padron,
} from "@/app/pages/DoctorProfilePage/api";
import { useNotify } from "@/app/hooks/useNotify";
import { X } from "lucide-react";
import Cargando from "@/app/components/ui/Cargando/Cargando";
import paleta from "@/app/styles/paleta.module.scss";

type Props = {
  medicoId: number | string;
};

type AlertType = "success" | "error" | "warning" | "info";

// 158, 273 (Sancor), 377, 380, 388 (Medife) y las asociadas de cualquier otra familia declarada ya las oculta el backend (`obra_social_principal_id`, GET /api/padrones/catalogo).
const EXCLUDED_OS = new Set([30, 213, 216, 227, 282, 360, 445]);

const normalize = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").trim();

function padronOSId(p: Padron): number {
  const fila: Record<string, unknown> = { ...p };
  return Number(
    fila.NRO_OBRA_SOCIAL ??
      fila.NRO_OBRASOCIAL ??
      fila.nro_obra_social ??
      fila.nro_obrasocial ??
      0
  );
}

const PadronesForm: React.FC<Props> = ({ medicoId }) => {
  const [loading, setLoading] = useState(true);
  const [pendingOS, setPendingOS] = useState<Set<number>>(new Set());

  const [catalog, setCatalog] = useState<ObraSocial[]>([]);
  const [, setPadrones] = useState<Padron[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const notify = useNotify();
  const opSeqRef = useRef(0);

  const [query, setQuery] = useState("");

  const [alertOpen, setAlertOpen] = useState(false);
  const [alertType, setAlertType] = useState<AlertType>("info");
  const [alertTitle, setAlertTitle] = useState("");
  const [alertMessage, setAlertMessage] = useState("");
  const [alertShowActions, setAlertShowActions] = useState(false);
  const [alertOnConfirm, setAlertOnConfirm] = useState<(() => void) | null>(null);

  // ─────────────────────────────────────────────────────────────
  // CARGA INICIAL
  // ─────────────────────────────────────────────────────────────
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        const [cat, prs] = await Promise.all([
          fetchObrasSociales(),
          fetchPadrones(medicoId),
        ]);
        if (!alive) return;
        setCatalog(cat.filter((os) => !EXCLUDED_OS.has(os.NRO_OBRA_SOCIAL)));
        setPadrones(prs);

        const s = new Set<number>();
        prs.forEach((p) => {
          const id = padronOSId(p);
          if (id) s.add(id);
        });
        setSelected(s);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [medicoId]);

  // ─────────────────────────────────────────────────────────────
  // SEARCH + ORDEN (asociadas primero)
  // ─────────────────────────────────────────────────────────────
  const filteredCatalog = useMemo(() => {
    const q = normalize(query);
    const base = q
      ? catalog.filter((os) => {
          const name = normalize(os.NOMBRE);
          const code = normalize(
            os.CODIGO ?? `OS${String(os.NRO_OBRA_SOCIAL).padStart(3, "0")}`
          );
          return name.includes(q) || code.includes(q);
        })
      : catalog.slice();

    base.sort((a, b) => {
      const aSel = selected.has(a.NRO_OBRA_SOCIAL);
      const bSel = selected.has(b.NRO_OBRA_SOCIAL);
      if (aSel !== bSel) return aSel ? -1 : 1;
      return a.NOMBRE.localeCompare(b.NOMBRE);
    });

    return base;
  }, [catalog, query, selected]);

  // ─────────────────────────────────────────────────────────────
  // TOGGLE (individual)
  // ─────────────────────────────────────────────────────────────
  async function persistToggle(nroOS: number, willSelect: boolean, _osName: string) {
    setPendingOS((prev) => new Set(prev).add(nroOS));
    const myOp = ++opSeqRef.current;

    try {
      if (willSelect) {
        // MARCA="S" explícito: sin esto el backend crea la fila con el default legacy "N" y el médico queda invisible en el padrón por obra…
        await addPadronByOS(medicoId, nroOS, { MARCA: "S" });
        notify.success(`Se agregó la obra social N° ${nroOS}.`);
      } else {
        await removePadronByOS(medicoId, nroOS);
        notify.info(`Se quitó la obra social N° ${nroOS}.`);
      }

      const fresh = await fetchPadrones(medicoId);
      if (myOp !== opSeqRef.current) return;

      setPadrones(fresh);
      const s = new Set<number>();
      fresh.forEach((p) => {
        const id = padronOSId(p);
        if (id) s.add(id);
      });
      setSelected(s);
    } catch {
      setSelected((prev) => {
        const copy = new Set(prev);
        if (willSelect) copy.delete(nroOS);
        else copy.add(nroOS);
        return copy;
      });
      notify.error("No se pudo guardar tu cambio. Intentá nuevamente.");
      setAlertType("error");
      setAlertTitle("No se pudo actualizar");
      setAlertMessage("Ocurrió un problema guardando tu selección. Intentá nuevamente.");
      setAlertShowActions(false);
      setAlertOnConfirm(null);
      setAlertOpen(true);
    } finally {
      setPendingOS((prev) => {
        const copy = new Set(prev);
        copy.delete(nroOS);
        return copy;
      });
    }
  }

  const handleToggle = (nroOS: number, name: string) => {
    if (loading) return;
    if (pendingOS.has(nroOS)) return;

    const willSelect = !selected.has(nroOS);

    setSelected((prev) => {
      const copy = new Set(prev);
      if (willSelect) copy.add(nroOS);
      else copy.delete(nroOS);
      return copy;
    });

    void persistToggle(nroOS, willSelect, name);
  };

  const allFilteredSelected = useMemo(() => {
    if (filteredCatalog.length === 0) return false;
    return filteredCatalog.every((os) => selected.has(os.NRO_OBRA_SOCIAL));
  }, [filteredCatalog, selected]);

  const anyFilteredSelected = useMemo(() => {
    return filteredCatalog.some((os) => selected.has(os.NRO_OBRA_SOCIAL));
  }, [filteredCatalog, selected]);

  // ─────────────────────────────────────────────────────────────
  // BULK
  // ─────────────────────────────────────────────────────────────
  async function bulkApplyForList(list: ObraSocial[], willSelect: boolean) {
    if (loading) return;
    if (list.length === 0) return;

    setLoading(true);
    setPendingOS((prev) => {
      const copy = new Set(prev);
      list.forEach((os) => copy.add(os.NRO_OBRA_SOCIAL));
      return copy;
    });

    setSelected((prev) => {
      const copy = new Set(prev);
      list.forEach((os) => {
        const id = os.NRO_OBRA_SOCIAL;
        if (willSelect) copy.add(id);
        else copy.delete(id);
      });
      return copy;
    });

    const myOp = ++opSeqRef.current;

    try {
      for (const os of list) {
        const id = os.NRO_OBRA_SOCIAL;
        const isSel = selected.has(id);
        if (willSelect && isSel) continue;
        if (!willSelect && !isSel) continue;

        if (willSelect) await addPadronByOS(medicoId, id, { MARCA: "S" });
        else await removePadronByOS(medicoId, id);
      }

      const fresh = await fetchPadrones(medicoId);
      if (myOp !== opSeqRef.current) return;

      setPadrones(fresh);
      const s = new Set<number>();
      fresh.forEach((p) => {
        const id = padronOSId(p);
        if (id) s.add(id);
      });
      setSelected(s);

      if (willSelect) notify.success("Se agregaron las obras sociales.");
      else notify.info("Se quitaron las obras sociales.");
    } catch {
      notify.error("No se pudieron aplicar los cambios masivos.");
      setAlertType("error");
      setAlertTitle("No se pudo actualizar");
      setAlertMessage("Ocurrió un problema aplicando cambios masivos. Intentá nuevamente.");
      setAlertShowActions(false);
      setAlertOnConfirm(null);
      setAlertOpen(true);

      try {
        const fresh = await fetchPadrones(medicoId);
        if (myOp !== opSeqRef.current) return;
        setPadrones(fresh);
        const s = new Set<number>();
        fresh.forEach((p) => {
          const id = padronOSId(p);
          if (id) s.add(id);
        });
        setSelected(s);
      } catch {
        // El error ya se avisó arriba: si tampoco se puede resincronizar, queda la lista que se veía.
      }
    } finally {
      setPendingOS((prev) => {
        const copy = new Set(prev);
        list.forEach((os) => copy.delete(os.NRO_OBRA_SOCIAL));
        return copy;
      });
      setLoading(false);
    }
  }

  const handleSelectAllFiltered = () => void bulkApplyForList(filteredCatalog, true);
  const handleClearAllFiltered = () => void bulkApplyForList(filteredCatalog, false);

  // ─────────────────────────────────────────────────────────────
  // EXPORTS
  // ─────────────────────────────────────────────────────────────
  const getSelectedRows = () =>
    catalog
      .filter((os) => selected.has(os.NRO_OBRA_SOCIAL))
      .map((os) => [
        os.CODIGO ?? `OS${String(os.NRO_OBRA_SOCIAL).padStart(3, "0")}`,
        os.NOMBRE,
      ]);

  const handleDownloadCsv = () => {
    if (selected.size === 0) {
      setAlertType("info");
      setAlertTitle("No hay datos para exportar");
      setAlertMessage("Seleccioná al menos una obra social para generar el CSV.");
      setAlertShowActions(false);
      setAlertOnConfirm(null);
      setAlertOpen(true);
      return;
    }
    const header = ["Código", "Obra social"];
    const rows = getSelectedRows();
    const csv = [header, ...rows]
      .map((row) => row.map((f) => `"${String(f).replace(/"/g, '""')}"`).join(";"))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    saveAs(blob, "padrones-obras-sociales.csv");
  };

  const handleDownloadPdf = async () => {
    if (selected.size === 0) {
      setAlertType("info");
      setAlertTitle("No hay datos para exportar");
      setAlertMessage("Seleccioná al menos una obra social para generar el PDF.");
      setAlertShowActions(false);
      setAlertOnConfirm(null);
      setAlertOpen(true);
      return;
    }
    const rows = getSelectedRows();
    const { jsPDF } = await import("jspdf");
    const { default: autoTable } = await import("jspdf-autotable");
    const doc = new jsPDF();
    doc.setFontSize(14);
    doc.text("Padrones - Obras sociales seleccionadas", 14, 18);
    autoTable(doc, { head: [["Código", "Obra social"]], body: rows, startY: 26 });
    doc.save("padrones-obras-sociales.pdf");
  };

  const selectedCountInFilter = filteredCatalog.filter((os) =>
    selected.has(os.NRO_OBRA_SOCIAL)
  ).length;

  // ─────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────
  return (
    <div className={styles.container}>
      {/* HEADER */}
      <div className={styles.header}>
        <div className={styles.headerTop}>
          <h2>Obras Sociales</h2>
          {selected.size > 0 && (
            <span className={styles.selectedBadge}>{selected.size} seleccionadas</span>
          )}
        </div>
        <p className={styles.subtitle}>
          Marcá las obras sociales con las que trabaja el médico
        </p>
      </div>

      {/* SEARCH + BULK ACTIONS */}
      <div className={styles.controlsRow}>
        <div className={styles.searchWrapper}>
          <svg className={styles.searchIcon} viewBox="0 0 20 20" fill="none">
            <circle cx="8.5" cy="8.5" r="5.5" stroke={paleta.tonoAzul300B} strokeWidth="1.5" />
            <path d="M13 13l4 4" stroke={paleta.tonoAzul300B} strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          <input
            className={styles.searchInput}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por nombre o código…"
            aria-label="Buscar obra social"
          />
          {query.trim().length > 0 && (
            <button
              type="button"
              className={styles.clearSearch}
              onClick={() => setQuery("")}
              aria-label="Limpiar búsqueda"
            >
              <X size={16} aria-hidden="true" />
            </button>
          )}
        </div>

        <div className={styles.bulkActions}>
          <button
            type="button"
            className={styles.bulkBtn}
            disabled={loading || filteredCatalog.length === 0 || allFilteredSelected}
            onClick={handleSelectAllFiltered}
            title={query.trim() ? "Seleccionar las obras sociales filtradas" : "Seleccionar todas"}
          >
            <svg viewBox="0 0 16 16" fill="none">
              <rect x="1" y="1" width="14" height="14" rx="3" stroke="currentColor" strokeWidth="1.5" fill={paleta.tonoAzul500B} />
              <path d="M4.5 8l2.5 2.5 4.5-5" stroke={paleta.white} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            {query.trim() ? "Sel. filtradas" : "Seleccionar todas"}
          </button>
          <button
            type="button"
            className={`${styles.bulkBtn} ${styles.bulkBtnOutline}`}
            disabled={loading || filteredCatalog.length === 0 || !anyFilteredSelected}
            onClick={handleClearAllFiltered}
            title={query.trim() ? "Quitar las obras sociales filtradas" : "Quitar todas"}
          >
            <svg viewBox="0 0 16 16" fill="none">
              <rect x="1" y="1" width="14" height="14" rx="3" stroke="currentColor" strokeWidth="1.5" />
              <path d="M5 8h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            {query.trim() ? "Quitar filtradas" : "Quitar todas"}
          </button>
        </div>
      </div>

      <p className={styles.searchMeta}>
        {query.trim()
          ? `${selectedCountInFilter} seleccionadas · ${filteredCatalog.length} resultado${filteredCatalog.length !== 1 ? "s" : ""} de ${catalog.length}`
          : `${filteredCatalog.length} obras sociales`}
      </p>

      {/* GRID */}
      <div className={styles.insuranceList}>
        {loading && catalog.length === 0 ? (
          Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className={styles.skeletonItem} />
          ))
        ) : filteredCatalog.length === 0 ? (
          <div className={styles.noResults}>
            No se encontraron obras sociales para &ldquo;{query}&rdquo;.
          </div>
        ) : (
          filteredCatalog.map((os) => {
            const code =
              os.CODIGO ?? `OS${String(os.NRO_OBRA_SOCIAL).padStart(3, "0")}`;
            const checked = selected.has(os.NRO_OBRA_SOCIAL);
            const pending = pendingOS.has(os.NRO_OBRA_SOCIAL);
            return (
              <label
                key={os.NRO_OBRA_SOCIAL}
                className={[
                  styles.insuranceItem,
                  checked ? styles.insuranceItemSelected : "",
                  pending ? styles.insuranceItemPending : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                <span className={styles.checkboxWrap}>
                  {pending ? (
                    <Cargando size={14} tono="marca" />
                  ) : (
                    <input
                      type="checkbox"
                      checked={checked}
                      disabled={loading || pending}
                      onChange={() => handleToggle(os.NRO_OBRA_SOCIAL, os.NOMBRE)}
                    />
                  )}
                </span>
                <div className={styles.insuranceInfo}>
                  <span className={styles.insuranceName}>{os.NOMBRE}</span>
                  <span className={styles.insuranceCode}>{code}</span>
                </div>
                {checked && !pending && (
                  <span className={styles.checkBadge} aria-hidden>
                    <svg viewBox="0 0 12 12" fill="none">
                      <path d="M2 6l3 3 5-5" stroke={paleta.white} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
                )}
              </label>
            );
          })
        )}
      </div>

      {/* DESCARGAS */}
      <div className={styles.downloadActions}>
        <button type="button" className={styles.downloadButton} onClick={handleDownloadCsv}>
          ↓ CSV
        </button>
        <button type="button" className={styles.downloadButton} onClick={handleDownloadPdf}>
          ↓ PDF
        </button>
      </div>

      {alertOpen && (
        <Alert
          type={alertType}
          title={alertTitle}
          message={alertMessage}
          showActions={alertShowActions}
          confirmLabel="Confirmar"
          cancelLabel="Cancelar"
          onClose={() => setAlertOpen(false)}
          onCancel={() => setAlertOpen(false)}
          onConfirm={
            alertOnConfirm
              ? () => {
                  const fn = alertOnConfirm;
                  setAlertOpen(false);
                  fn();
                }
              : undefined
          }
        />
      )}
    </div>
  );
};

export default PadronesForm;
