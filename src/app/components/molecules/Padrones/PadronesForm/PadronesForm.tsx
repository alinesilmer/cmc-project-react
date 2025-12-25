"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { saveAs } from "file-saver";

import styles from "./PadronesForm.module.scss";
// ❌ Se quita EmailConsentModal
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

const PadronesForm: React.FC<Props> = ({ medicoId, onPreview, onSubmit }) => {
  // 📚 Catálogo
  const [catalog, setCatalog] = useState<ObraSocial[]>([]);
  // 🔗 Vínculos existentes
  const [padrones, setPadrones] = useState<Padron[]>([]);
  // ✅ Selección por NRO_OBRA_SOCIAL
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const notify = useNotify();

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
    (async () => {
      const [cat, prs] = await Promise.all([
        fetchObrasSociales("S"),
        fetchPadrones(medicoId),
      ]);
      setCatalog(cat);
      setPadrones(prs);
      setSelected(new Set(prs.map((p) => p.NRO_OBRASOCIAL)));
    })();
  }, [medicoId]);

  // ─────────────────────────────────────────────────────────────
  // SEARCH
  // ─────────────────────────────────────────────────────────────
  const filteredCatalog = useMemo(() => {
    const q = normalize(query);
    if (!q) return catalog;
    return catalog.filter((os) => {
      const name = normalize(os.NOMBRE);
      const code = normalize(
        os.CODIGO ?? `OS${String(os.NRO_OBRA_SOCIAL).padStart(3, "0")}`
      );
      return name.includes(q) || code.includes(q);
    });
  }, [catalog, query]);

  // ─────────────────────────────────────────────────────────────
  // CHECKBOX: crea/borra en server y notifica
  // ─────────────────────────────────────────────────────────────
  async function persistToggle(
    nroOS: number,
    willSelect: boolean,
    osName: string
  ) {
    try {
      if (willSelect) {
        await addPadronByOS(medicoId, nroOS);
        notify.success(`Se agregó la obra social N° ${nroOS}.`);
      } else {
        await removePadronByOS(medicoId, nroOS);
        notify.info(`Se quitó la obra social N° ${nroOS}.`);
      }
      // refresh para mantener IDs correctos
      const fresh = await fetchPadrones(medicoId);
      setPadrones(fresh);
      setSelected(new Set(fresh.map((p) => p.NRO_OBRASOCIAL)));
    } catch (e) {
      // revertir selección si falló
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
    }
  }

  const handleToggle = (nroOS: number, name: string) => {
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

      {/* BOTONES DE ACCIÓN (opcionales) */}
      {/* <div className={styles.actions}>
        <button
          type="button"
          className={styles.previewButton}
          onClick={handlePreview}
        >
          Ver previsualización
        </button>
        <button
          type="button"
          className={styles.submitButton}
          onClick={handleSubmit}
        >
          Enviar formulario
        </button>
      </div> */}

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
