import React from "react";
import LayoutRegister from "@/app/features/registro/components/Layout/Layout";
import ObrasSocialesSteps from "./ObrasSocialesSteps/ObrasSocialesSteps";
import styles from "@/app/features/registro/components/Register.module.scss";
import { useNavigate } from "react-router-dom";
import { useObrasSocialesForm } from "@/app/pages/ObrasSocialesRegisterPage/useObrasSocialesForm";

const stepsMeta = [
  { id: 1, title: "Datos de la Obra Social", icon: "🏥" },
  { id: 2, title: "Representante Legal", icon: "👤" },
  { id: 3, title: "Documentación", icon: "📄" },
];

const ObrasSocialesRegister: React.FC = () => {
  const nav = useNavigate();
  const form = useObrasSocialesForm();

  return (
    <LayoutRegister
      steps={stepsMeta}
      currentStep={form.step}
      onBack={form.prevStep}
      showBack={form.step > 1}
    >
      <div className={styles.actionBar}>
        <button className={styles.backBtn} onClick={() => nav("/panel/login")}>
          Cancelar
        </button>
      </div>

      <ObrasSocialesSteps
        step={form.step}
        formData={form.formData}
        errors={form.errors}
        provinces={form.provinces}
        localities={form.localities}
        onChange={form.onChange}
        getInputProps={form.getInputProps}
        files={form.files}
        setFiles={form.setFiles}
        fileErrs={form.fileErrs}
        setFileErrs={form.setFileErrs}
      />

      <div className={styles.nav}>
        {form.step > 1 ? (
          <button className={styles.prev} onClick={form.prevStep}>
            ← Atrás
          </button>
        ) : (
          <span />
        )}
        {form.step < 3 ? (
          <button className={styles.next} onClick={form.nextStep}>
            Siguiente →
          </button>
        ) : (
          <button className={styles.submit} onClick={form.submitAll}>
            Enviar Solicitud
          </button>
        )}
      </div>
    </LayoutRegister>
  );
};

export default ObrasSocialesRegister;
