import React, { useState } from "react";
import styles from "./PadronesForm.module.scss";

type Insurance = {
  id: string;
  name: string;
  code: string;
};

const insurances: Insurance[] = [
  { id: "1", name: "OSDE", code: "OS001" },
  { id: "2", name: "Swiss Medical", code: "OS002" },
  { id: "3", name: "Galeno", code: "OS003" },
  { id: "4", name: "Medifé", code: "OS004" },
  { id: "5", name: "IOSCOR", code: "OS005" },
  { id: "6", name: "PAMI", code: "OS006" },
  { id: "7", name: "OSECAC", code: "OS007" },
  { id: "8", name: "OSPRERA", code: "OS008" },
  { id: "9", name: "OSPATCA", code: "OS009" },
  { id: "10", name: "OSDE Binario", code: "OS010" },
  { id: "11", name: "DASUTEN", code: "OS011" },
  { id: "12", name: "Luis Pasteur", code: "OS012" },
];

type Props = {
  onPreview: (selected: string[]) => void;
  onSubmit: (selected: string[]) => void;
};

const PadronesForm: React.FC<Props> = ({ onPreview, onSubmit }) => {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [showWarning, setShowWarning] = useState(false);

  const toggleInsurance = (id: string) => {
    setSelected((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const handlePreview = () => {
    onPreview(Array.from(selected));
  };

  const handleSubmit = () => {
    if (selected.size === 0) {
      alert("Por favor, seleccione al menos una obra social.");
      return;
    }
    setShowWarning(true);
  };

  const confirmSubmit = () => {
    onSubmit(Array.from(selected));
    setShowWarning(false);
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2>Seleccionar Obras Sociales</h2>
        <p className={styles.subtitle}>
          Marque las obras sociales con las que trabajará
        </p>
      </div>

      <div className={styles.insuranceList}>
        {insurances.map((insurance) => (
          <label key={insurance.id} className={styles.insuranceItem}>
            <input
              type="checkbox"
              checked={selected.has(insurance.id)}
              onChange={() => toggleInsurance(insurance.id)}
            />
            <div className={styles.insuranceInfo}>
              <span className={styles.insuranceName}>{insurance.name}</span>
              <span className={styles.insuranceCode}>Código: {insurance.code}</span>
            </div>
          </label>
        ))}
      </div>

      <div className={styles.helpBox}>
        <p className={styles.helpText}>
          Si tiene algún inconveniente o consulta, por favor comuníquese con:
        </p>
        <p className={styles.helpContact}>
          <strong>Colegio Médico de Corrientes</strong>
        </p>
        <p className={styles.helpContact}>📞 (0379) 442-3456</p>
        <p className={styles.helpContact}>📧 info@cmcorrientes.org.ar</p>
      </div>

      <div className={styles.actions}>
        <button
          className={styles.previewBtn}
          onClick={handlePreview}
          disabled={selected.size === 0}
        >
          Previsualizar
        </button>
        <button
          className={styles.submitBtn}
          onClick={handleSubmit}
          disabled={selected.size === 0}
        >
          Enviar
        </button>
      </div>

      {showWarning && (
        <div className={styles.warningOverlay}>
          <div className={styles.warningModal}>
            <h3>⚠️ Confirmar Envío</h3>
            <p>
              Por favor, verifique que toda la información sea correcta antes de
              enviar. Una vez enviado, el formulario será procesado por el equipo
              administrativo.
            </p>
            <div className={styles.warningActions}>
              <button
                className={styles.cancelBtn}
                onClick={() => setShowWarning(false)}
              >
                Revisar
              </button>
              <button className={styles.confirmBtn} onClick={confirmSubmit}>
                Confirmar y Enviar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PadronesForm;
