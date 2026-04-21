"use client";
import React from "react";
import LayoutRegister from "./Layout/Layout";
import Steps from "./Steps/Steps";
import styles from "./Register.module.scss";
import { useNavigate } from "react-router-dom";
import { useRegisterForm } from "../../../hooks/register/useRegisterForm";
import Button from "../../atoms/Button/Button";

type Props = {
  mode: "public" | "admin";
  showAdherentePrompt?: boolean; // sólo para público
  stepsMeta: { id: number; title: string; icon: string }[];
  specialties: { id: number; id_colegio_espe: number; nombre: string }[];
  adherenteAnim?: object | null;
};

const RegisterBase: React.FC<Props> = ({
  mode,
  showAdherentePrompt = false,
  stepsMeta,
  specialties
}) => {
  const nav = useNavigate();
  const rf = useRegisterForm(mode, { showAdherentePrompt });

  return (
    <>
      <LayoutRegister
        steps={stepsMeta}
        currentStep={rf.step}
        onBack={rf.prevStep}
        showBack={rf.step > 1}
        headerCta={
          mode === "public" ? (
            <button
              className={styles.adherenteLink}
              onClick={() => nav("/panel/adherente")}
            >
              Quiero ser socio adherente
            </button>
          ) : null
        }
      >
        <div className={styles.actionBar}>
          {mode == "admin" ? (
            <Button
            variant="ghost" 
            size="md"
              onClick={() => nav("/panel/dashboard")}
            >
              Cancelar
            </Button>
          ) : (
            <Button
            variant="ghost" 
            size="md"
              onClick={() => nav("/panel/login")}
            >
              Cancelar
            </Button>
          )}
        </div>

        <Steps
          step={rf.step}
          formData={rf.formData}
          errors={rf.errors}
          provinces={rf.provinces}
          localities={rf.localities}
          specialties={specialties}
          onChange={rf.onChange}
          getInputProps={rf.getInputProps}
          files={rf.files}
          setFiles={rf.setFiles}
          fileErrs={rf.fileErrs}
          setFileErrs={rf.setFileErrs}
          specItems={rf.specItems}
          setSpecItems={rf.setSpecItems}
        />

        {/* NAV: cambia según modo y step */}
        <div className={styles.nav}>
          {rf.step > 1 ? (
            <Button variant="ghost" size="md" onClick={rf.prevStep}>
              ← Atrás
            </Button>
          ) : (
            <span />
          )}

          {mode === "public" ? (
            // --- PÚBLICO: igual que antes ---
            rf.step < 4 ? (
              <Button variant="secondary" size="md" onClick={rf.nextStep}>
                Siguiente →
              </Button>
            ) : (
              <Button variant="primary" size="md" onClick={rf.submitAll}>
                Enviar Solicitud
              </Button>
            )
          ) : // --- ADMIN ---
          rf.step < 4 ? (
            // Pasos 1–3: sólo Guardar y continuar
            <Button variant="secondary" size="md" onClick={rf.saveAndContinue}>
              Guardar y continuar →
            </Button>
          ) : (
            // Paso 4: Guardar y terminar
            <Button variant="primary" size="md" onClick={rf.saveAndFinish}>
              Guardar y terminar
            </Button>
          )}
        </div>
      </LayoutRegister>

      
    </>
  );
};

export default RegisterBase;
