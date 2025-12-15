"use client";

import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { saveAs } from "file-saver";

import styles from "./PadronesForm.module.scss";
import EmailConsentModal from "../EmailConsentModal/EmailConsentModal";
import SuccessModal from "../../SuccessModal/SuccessModal";
import Alert from "../../../atoms/Alert/Alert";

type Insurance = {
  id: string;
  name: string;
  code: string;
};

const insurances: Insurance[] = [
  { id: "1", name: "ASCMUTUAL PROTECCION FAMILIAR", code: "OS001" },
  { id: "2", name: "ASOCIACIÓN MUTUAL SANCOR", code: "OS002" },
  { id: "3", name: "ASSISTRAVEL", code: "OS003" },
  { id: "4", name: "AVALIAN", code: "OS004" },
  { id: "5", name: "BOREAL SALUD", code: "OS005" },
  { id: "6", name: "BRAMED SRL", code: "OS006" },
  { id: "7", name: "CONFERENCIA EPISCOPAL ARG", code: "OS007" },
  { id: "8", name: "DASUTEN", code: "OS008" },
  { id: "9", name: "FARMACIA", code: "OS009" },
  { id: "10", name: "GALENO", code: "OS010" },
  { id: "11", name: "GERDANNA SA", code: "OS011" },
  { id: "12", name: "GRUPO MELD SALUD", code: "OS012" },
  { id: "13", name: "IOSCOR", code: "OS013" },
  { id: "14", name: "IOSFA", code: "OS014" },
  { id: "15", name: "LUIS PASTEUR", code: "OS015" },
  { id: "16", name: "MEDICUS", code: "OS016" },
  { id: "17", name: "MEDIFE", code: "OS017" },
  { id: "18", name: "MEPLIFE SALUD", code: "OS018" },
  { id: "19", name: "MTRABDE METALURGICO", code: "OS019" },
  { id: "20", name: "NOBIS MEDICAL", code: "OS020" },
  { id: "21", name: "NUEVA MUTUAL SERV-MEDICAL WORK", code: "OS021" },
  { id: "22", name: "OBRA SOCIAL DE FUTBOLISTAS", code: "OS022" },
  { id: "23", name: "OMINT SA", code: "OS023" },
  { id: "24", name: "OPDEA", code: "OS024" },
  { id: "25", name: "OSAPM", code: "OS025" },
  { id: "26", name: "OSCTCP", code: "OS026" },
  { id: "27", name: "OSDEPYM", code: "OS027" },
  { id: "28", name: "OSDOP", code: "OS028" },
  { id: "29", name: "OSEMM", code: "OS029" },
  { id: "30", name: "OSETYA", code: "OS030" },
  { id: "31", name: "OSFFENTOS", code: "OS031" },
  { id: "32", name: "OSJERA", code: "OS032" },
  { id: "33", name: "OSMATA", code: "OS033" },
  { id: "34", name: "OSPEP - OBRA SOCIAL DEL PERSONAL DE PANAD", code: "OS034" },
  { id: "35", name: "OSPERYHRA", code: "OS035" },
  { id: "36", name: "OSPIL", code: "OS036" },
  { id: "37", name: "OSPIM", code: "OS037" },
  { id: "38", name: "OSPM", code: "OS038" },
  { id: "39", name: "OSPPRA", code: "OS039" },
  { id: "40", name: "OSPSA", code: "OS040" },
  { id: "41", name: "OSPTA", code: "OS041" },
  { id: "42", name: "OSPTV", code: "OS042" },
  { id: "43", name: "OSSEG", code: "OS043" },
  { id: "44", name: "OSSACRA", code: "OS044" },
  { id: "45", name: "OSSIMRA", code: "OS045" },
  { id: "46", name: "OSTPCHPY ARA", code: "OS046" },
  { id: "47", name: "OSTRAC", code: "OS047" },
  { id: "48", name: "PATRONES DE CABOTAJE", code: "OS048" },
  { id: "49", name: "POLICÍA FEDERAL", code: "OS049" },
  { id: "50", name: "PREVENCIÓN SALUD SA", code: "OS050" },
  { id: "51", name: "PROGRAMAS MEDICOS SOC ARG DE CONSULTO", code: "OS051" },
  { id: "52", name: "SADAIC", code: "OS052" },
  { id: "53", name: "SCIS", code: "OS053" },
  { id: "54", name: "SPF", code: "OS054" },
  { id: "55", name: "SUPERINTENDENCIA RIESGO DEL TRABAJO", code: "OS055" },
  { id: "56", name: "SWISS MEDICAL", code: "OS056" },
  { id: "57", name: "UDEL PERSONAL CIVIL DE LA NAC", code: "OS057" },
  { id: "58", name: "UNIÓN OBRERA METALÚRGICA", code: "OS058" },
  { id: "59", name: "UNIÓN PERSONAL", code: "OS059" },
  { id: "60", name: "UNNE", code: "OS060" },
];

type Props = {
  onPreview: (selected: string[]) => void;
  onSubmit: (selected: string[]) => void;
};

type AlertType = "success" | "error" | "warning" | "info";

const normalize = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();

const PadronesForm: React.FC<Props> = ({ onPreview, onSubmit }) => {
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // ✅ Search
  const [query, setQuery] = useState("");

  const [showEmailConsent, setShowEmailConsent] = useState(false);
  const [pendingInsuranceId, setPendingInsuranceId] = useState<string | null>(
    null
  );
  const [pendingInsuranceName, setPendingInsuranceName] = useState("");

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

  const requiresEmailConsent = (insuranceName: string): boolean => {
    const upperName = insuranceName.toUpperCase();
    return upperName.includes("UNNE") || upperName.includes("SWISS MEDICAL");
  };

  const filteredInsurances = useMemo(() => {
    const q = normalize(query);
    if (!q) return insurances;

    return insurances.filter((ins) => {
      const name = normalize(ins.name);
      const code = normalize(ins.code);
      return name.includes(q) || code.includes(q);
    });
  }, [query]);

  const toggleInsurance = (id: string) => {
    const insurance = insurances.find((ins) => ins.id === id);
    if (!insurance) return;

    if (!selected.has(id) && requiresEmailConsent(insurance.name)) {
      setPendingInsuranceId(id);
      setPendingInsuranceName(insurance.name);
      setShowEmailConsent(true);
      return;
    }

    setSelected((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) newSet.delete(id);
      else newSet.add(id);
      return newSet;
    });
  };

  const handleEmailConsentAccept = () => {
    if (pendingInsuranceId) {
      setSelected((prev) => {
        const newSet = new Set(prev);
        newSet.add(pendingInsuranceId);
        return newSet;
      });
    }
    setShowEmailConsent(false);
    setPendingInsuranceId(null);
    setPendingInsuranceName("");
  };

  const handleEmailConsentCancel = () => {
    setShowEmailConsent(false);
    setPendingInsuranceId(null);
    setPendingInsuranceName("");
  };

  const handlePreview = () => {
    if (selected.size === 0) {
      setAlertType("info");
      setAlertTitle("No hay obras sociales seleccionadas");
      setAlertMessage(
        "Seleccioná al menos una obra social para poder ver la previsualización de los padrones."
      );
      setAlertShowActions(false);
      setAlertOnConfirm(null);
      setAlertOpen(true);
      return;
    }
    onPreview(Array.from(selected));
  };

  const confirmSubmit = () => {
    const selectedIds = Array.from(selected);
    onSubmit(selectedIds);

    const selectedNames = insurances
      .filter((ins) => selectedIds.includes(ins.id))
      .map((ins) => ins.name);

    let msg: string;
    if (selectedNames.length === 1) {
      msg = `Se envió el padrón de la obra social ${selectedNames[0]}.`;
    } else if (selectedNames.length > 1 && selectedNames.length <= 3) {
      msg = `Se enviaron los padrones de: ${selectedNames.join(", ")}.`;
    } else {
      msg = `Se enviaron los padrones de ${selectedNames.length} obras sociales seleccionadas.`;
    }

    setSuccessMessage(
      msg +
        " Nuestro equipo del Colegio Médico de Corrientes revisará la información a la brevedad."
    );
    setShowSuccess(true);
  };

  const handleSubmit = () => {
    if (selected.size === 0) {
      setAlertType("warning");
      setAlertTitle("Seleccioná al menos una obra social");
      setAlertMessage(
        "Para enviar los padrones, primero tenés que marcar al menos una obra social con la que trabajás."
      );
      setAlertShowActions(false);
      setAlertOnConfirm(null);
      setAlertOpen(true);
      return;
    }

    setAlertType("warning");
    setAlertTitle("¿Confirmar envío de padrones?");
    setAlertMessage(
      "Se enviarán los padrones de las obras sociales seleccionadas al Colegio Médico de Corrientes. ¿Querés continuar?"
    );
    setAlertShowActions(true);
    setAlertOnConfirm(() => confirmSubmit);
    setAlertOpen(true);
  };

  const handleSuccessClose = () => {
    setShowSuccess(false);
    navigate("/");
  };

  const getSelectedRows = () =>
    insurances
      .filter((ins) => selected.has(ins.id))
      .map((ins) => [ins.code, ins.name]);

  const handleDownloadCsv = () => {
    if (selected.size === 0) {
      setAlertType("info");
      setAlertTitle("No hay datos para exportar");
      setAlertMessage(
        "Seleccioná al menos una obra social para generar el archivo CSV con los padrones."
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
        row
          .map((field) => `"${String(field).replace(/"/g, '""')}"`)
          .join(";")
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
        "Seleccioná al menos una obra social para generar el PDF con los padrones."
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

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2>Seleccionar Obras Sociales</h2>
        <p className={styles.subtitle}>
          Marque las obras sociales con las que trabajará
        </p>
      </div>

      {/* ✅ SEARCH BAR */}
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
        Mostrando {filteredInsurances.length} de {insurances.length}
      </p>

      <div className={styles.insuranceList}>
        {filteredInsurances.length === 0 ? (
          <div className={styles.noResults}>
            No se encontraron obras sociales para “{query}”.
          </div>
        ) : (
          filteredInsurances.map((insurance) => (
            <label key={insurance.id} className={styles.insuranceItem}>
              <input
                type="checkbox"
                checked={selected.has(insurance.id)}
                onChange={() => toggleInsurance(insurance.id)}
              />
              <div className={styles.insuranceInfo}>
                <span className={styles.insuranceName}>{insurance.name}</span>
                <span className={styles.insuranceCode}>
                  Código: {insurance.code}
                </span>
              </div>
            </label>
          ))
        )}
      </div>

      {/* BOTONES DE ACCIÓN */}
      <div className={styles.actions}>
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

      {/* MODAL DE ÉXITO CON MENSAJE PERSONALIZADO */}
      <SuccessModal
        open={showSuccess}
        onClose={handleSuccessClose}
        title="¡Padrones enviados con éxito!"
        message={successMessage}
      />

      {/* ALERTA GENÉRICA CUSTOM */}
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

      <EmailConsentModal
        open={showEmailConsent}
        insuranceName={pendingInsuranceName}
        onAccept={handleEmailConsentAccept}
        onCancel={handleEmailConsentCancel}
      />
    </div>
  );
};

export default PadronesForm;
