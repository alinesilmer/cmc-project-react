"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { saveAs } from "file-saver";

import styles from "./PadronesForm.module.scss";
import SuccessModal from "../../SuccessModal/SuccessModal";
import Alert from "../../../atoms/Alert/Alert";

// 🔌 API helpers
import {
  fetchObrasSociales,
  fetchPadrones,
  addPadronByOS,
  removePadronByOS,
  type ObraSocial,
  type Padron,
} from "../../../../pages/DoctorProfilePage/api";
import { useNotify } from "../../../../hooks/useNotify";

// ✅ Props
type Props = {
  medicoId: number | string;
  onPreview?: (selected: string[]) => void;
  onSubmit?: (selected: string[]) => void;
};

type AlertType = "success" | "error" | "warning" | "info";

const normalize = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();

// helper pequeño para tolerar ambos nombres en el padrón
function padronOSId(p: Padron): number {
  return Number(
    (p as any)?.NRO_OBRA_SOCIAL ??
      (p as any)?.NRO_OBRASOCIAL ??
      (p as any)?.nro_obra_social ??
      (p as any)?.nro_obrasocial ??
      0
  );
}

const PadronesForm: React.FC<Props> = ({ medicoId, onPreview, onSubmit }) => {
  const [loading, setLoading] = useState(true);
  const [pendingOS, setPendingOS] = useState<Set<number>>(new Set());

  // 📚 Catálogo
  const [catalog, setCatalog] = useState<ObraSocial[]>([]);
  // 🔗 Vínculos existentes
  const [padrones, setPadrones] = useState<Padron[]>([]);
  // ✅ Selección por NRO_OBRA_SOCIAL
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const notify = useNotify();
  const opSeqRef = React.useRef(0);

  // 🔎 Search
  const [query, setQuery] = useState("");

  // ✅ Éxito / Alertas
  const [showSuccess, setShowSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | undefined>();
  const [alertOpen, setAlertOpen] = useState(false);
  const [alertType, setAlertType] = useState<AlertType>("info");
  const [alertTitle, setAlertTitle] = useState("");
  const [alertMessage, setAlertMessage] = useState("");
  const [alertShowActions, setAlertShowActions] = useState(false);
  const [alertOnConfirm, setAlertOnConfirm] = useState<(() => void) | null>(
    null
  );

  const navigate = useNavigate();

  // ─────────────────────────────────────────────────────────────
  // CARGA INICIAL
  // ─────────────────────────────────────────────────────────────
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        const [cat, prs] = await Promise.all([
          fetchObrasSociales("S"),
          fetchPadrones(medicoId),
        ]);
        if (!alive) return;
        setCatalog(cat);
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

    // 👉 asociadas primero, luego alfabético por nombre
    base.sort((a, b) => {
      const aSel = selected.has(a.NRO_OBRA_SOCIAL);
      const bSel = selected.has(b.NRO_OBRA_SOCIAL);
      if (aSel !== bSel) return aSel ? -1 : 1;
      return a.NOMBRE.localeCompare(b.NOMBRE);
    });

    return base;
  }, [catalog, query, selected]);

  // ─────────────────────────────────────────────────────────────
  // CHECKBOX: crea/borra en server y notifica
  // ─────────────────────────────────────────────────────────────
  async function persistToggle(
    nroOS: number,
    willSelect: boolean,
    osName: string
  ) {
    // marcar OS como pendiente
    setPendingOS((prev) => new Set(prev).add(nroOS));
    // registrar nº de operación para evitar pisadas con respuestas viejas
    const myOp = ++opSeqRef.current;

    try {
      if (willSelect) {
        await addPadronByOS(medicoId, nroOS);
        notify.success(`Se agregó la obra social N° ${nroOS}.`);
      } else {
        await removePadronByOS(medicoId, nroOS);
        notify.info(`Se quitó la obra social N° ${nroOS}.`);
      }

      // refrescar desde el server
      const fresh = await fetchPadrones(medicoId);

      // si mientras tanto hubo otra operación más nueva, NO pisamos
      if (myOp !== opSeqRef.current) return;

      setPadrones(fresh);
      const s = new Set<number>();
      fresh.forEach((p) => {
        const id = padronOSId(p);
        if (id) s.add(id);
      });
      setSelected(s);
    } catch (e) {
      // revertir optimista si falló
      setSelected((prev) => {
        const copy = new Set(prev);
        if (willSelect) copy.delete(nroOS);
        else copy.add(nroOS);
        return copy;
      });
      notify.error("No se pudo guardar tu cambio. Intentá nuevamente.");
      setAlertType("error");
      setAlertTitle("No se pudo actualizar");
      setAlertMessage(
        "Ocurrió un problema guardando tu selección. Intentá nuevamente."
      );
      setAlertShowActions(false);
      setAlertOnConfirm(null);
      setAlertOpen(true);
    } finally {
      // quitar de pendientes
      setPendingOS((prev) => {
        const copy = new Set(prev);
        copy.delete(nroOS);
        return copy;
      });
    }
  }

  const handleToggle = (nroOS: number, name: string) => {
    if (loading) return; // aún cargando
    if (pendingOS.has(nroOS)) return; // ya hay una op en vuelo para esta OS

    const willSelect = !selected.has(nroOS);

    // Optimista
    setSelected((prev) => {
      const copy = new Set(prev);
      if (willSelect) copy.add(nroOS);
      else copy.delete(nroOS);
      return copy;
    });

    void persistToggle(nroOS, willSelect, name);
  };

  // ─────────────────────────────────────────────────────────────
  // PREVIEW / SUBMIT (opcionales)
  // ─────────────────────────────────────────────────────────────
  const handlePreview = () => {
    if (!onPreview) return;
    if (selected.size === 0) {
      setAlertType("info");
      setAlertTitle("No hay obras sociales seleccionadas");
      setAlertMessage(
        "Seleccioná al menos una obra social para previsualizar."
      );
      setAlertShowActions(false);
      setAlertOnConfirm(null);
      setAlertOpen(true);
      return;
    }
    onPreview(Array.from(selected).map(String));
  };

  const confirmSubmit = () => {
    const selectedIds = Array.from(selected).map(String);
    onSubmit?.(selectedIds);

    const names = catalog
      .filter((os) => selected.has(os.NRO_OBRA_SOCIAL))
      .map((os) => os.NOMBRE);

    let msg: string;
    if (names.length === 1)
      msg = `Se envió el padrón de la obra social ${names[0]}.`;
    else if (names.length > 1 && names.length <= 3)
      msg = `Se enviaron los padrones de: ${names.join(", ")}.`;
    else
      msg = `Se enviaron los padrones de ${names.length} obras sociales seleccionadas.`;

    setSuccessMessage(
      msg + " Nuestro equipo revisará la información a la brevedad."
    );
    setShowSuccess(true);
  };

  const handleSubmit = () => {
    if (!onSubmit) return; // si no usan Submit, no mostramos confirm
    if (selected.size === 0) {
      setAlertType("warning");
      setAlertTitle("Seleccioná al menos una obra social");
      setAlertMessage(
        "Para enviar los padrones, marcá al menos una obra social."
      );
      setAlertShowActions(false);
      setAlertOnConfirm(null);
      setAlertOpen(true);
      return;
    }
    setAlertType("warning");
    setAlertTitle("¿Confirmar envío de padrones?");
    setAlertMessage(
      "Se enviarán los padrones de las obras sociales seleccionadas."
    );
    setAlertShowActions(true);
    setAlertOnConfirm(() => confirmSubmit);
    setAlertOpen(true);
  };

  const handleSuccessClose = () => {
    setShowSuccess(false);
    navigate("/");
  };

  // ─────────────────────────────────────────────────────────────
  // EXPORTS (CSV / PDF)
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
      setAlertMessage(
        "Seleccioná al menos una obra social para generar el CSV."
      );
      setAlertShowActions(false);
      setAlertOnConfirm(null);
      setAlertOpen(true);
      return;
    }

    const header = ["Código", "Obra social"];
    const rows = getSelectedRows();
    const csv = [header, ...rows]
      .map((row) =>
        row.map((f) => `"${String(f).replace(/"/g, '""')}"`).join(";")
      )
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    saveAs(blob, "padrones-obras-sociales.csv");
  };

  const handleDownloadPdf = () => {
    if (selected.size === 0) {
      setAlertType("info");
      setAlertTitle("No hay datos para exportar");
      setAlertMessage(
        "Seleccioná al menos una obra social para generar el PDF."
      );
      setAlertShowActions(false);
      setAlertOnConfirm(null);
      setAlertOpen(true);
      return;
    }

    const rows = getSelectedRows();
    const doc = new jsPDF();
    doc.setFontSize(14);
    doc.text("Padrones - Obras sociales seleccionadas", 14, 18);
    autoTable(doc, {
      head: [["Código", "Obra social"]],
      body: rows,
      startY: 26,
    });
    doc.save("padrones-obras-sociales.pdf");
  };

  // ─────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────
  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2>Seleccionar Obras Sociales</h2>
        <p className={styles.subtitle}>
          Marque las obras sociales con las que trabajará
        </p>
      </div>

      {/* 🔎 SEARCH BAR */}
      <div className={styles.searchRow}>
        <input
          className={styles.searchInput}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar por nombre o código (ej: Swiss, OS056)…"
          aria-label="Buscar obra social"
        />
        {query.trim().length > 0 && (
          <button
            type="button"
            className={styles.clearSearch}
            onClick={() => setQuery("")}
          >
            Limpiar
          </button>
        )}
      </div>

      <p className={styles.searchMeta}>
        Mostrando {filteredCatalog.length} de {catalog.length}
      </p>

      <div className={styles.insuranceList}>
        {filteredCatalog.length === 0 ? (
          <div className={styles.noResults}>
            No se encontraron obras sociales para “{query}”.
          </div>
        ) : (
          filteredCatalog.map((os) => {
            const code =
              os.CODIGO ?? `OS${String(os.NRO_OBRA_SOCIAL).padStart(3, "0")}`;
            const checked = selected.has(os.NRO_OBRA_SOCIAL);
            return (
              <label key={os.NRO_OBRA_SOCIAL} className={styles.insuranceItem}>
                <input
                  type="checkbox"
                  checked={checked}
                  disabled={loading || pendingOS.has(os.NRO_OBRA_SOCIAL)}
                  onChange={() => handleToggle(os.NRO_OBRA_SOCIAL, os.NOMBRE)}
                />
                <div className={styles.insuranceInfo}>
                  <span className={styles.insuranceName}>{os.NOMBRE}</span>
                  <span className={styles.insuranceCode}>Código: {code}</span>
                </div>
              </label>
            );
          })
        )}
      </div>

      {/* DESCARGAS */}
      <div className={styles.downloadActions}>
        <button
          type="button"
          className={styles.downloadButton}
          onClick={handleDownloadCsv}
        >
          Descargar CSV
        </button>
        <button
          type="button"
          className={styles.downloadButton}
          onClick={handleDownloadPdf}
        >
          Descargar PDF
        </button>
      </div>

      {/* MODAL DE ÉXITO */}
      <SuccessModal
        open={showSuccess}
        onClose={handleSuccessClose}
        title="¡Padrones enviados con éxito!"
        message={successMessage}
      />

      {/* ALERTA */}
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
