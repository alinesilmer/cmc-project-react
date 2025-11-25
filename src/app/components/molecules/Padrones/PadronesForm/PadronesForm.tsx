import React, { useState } from "react";
import styles from "./PadronesForm.module.scss";

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
