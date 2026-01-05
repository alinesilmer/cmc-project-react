"use client";
import React from "react";
import LayoutRegister from "./Layout/Layout";
import Steps from "./Steps/Steps";
import styles from "./Register.module.scss";
import Lottie from "lottie-react";
import { useNavigate } from "react-router-dom";
import { useRegisterForm } from "../../../hooks/register/useRegisterForm";

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
  specialties,
  adherenteAnim,
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
            <button
              className={styles.backBtn}
              onClick={() => nav("/panel/dashboard")}
            >
              Cancelar
            </button>
          ) : (
            <button
              className={styles.backBtn}
              onClick={() => nav("/panel/login")}
            >
              Cancelar
            </button>
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
            <button className={styles.prev} onClick={rf.prevStep}>
              ← Atrás
            </button>
          ) : (
            <span />
          )}

          {mode === "public" ? (
            // --- PÚBLICO: igual que antes ---
            rf.step < 4 ? (
              <button className={styles.next} onClick={rf.nextStep}>
                Siguiente →
              </button>
            ) : (
              <button className={styles.submit} onClick={rf.submitAll}>
                Enviar Solicitud
              </button>
            )
          ) : // --- ADMIN ---
          rf.step < 4 ? (
            // Pasos 1–3: sólo Guardar y continuar
            <button className={styles.next} onClick={rf.saveAndContinue}>
              Guardar y continuar →
            </button>
          ) : (
            // Paso 4: Guardar y terminar
            <button className={styles.submit} onClick={rf.saveAndFinish}>
              Guardar y terminar
            </button>
          )}
        </div>
      </LayoutRegister>

      {/* {mode === "public" && showAdherentePrompt && rf.askAdherente && (
        <div
          className={styles.modalOverlay}
          onClick={() => rf.setAskAdherente(false)}
        >
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.animWrap}>
              {adherenteAnim ? (
                <Lottie
                  animationData={adherenteAnim}
                  loop
                  autoplay
                  style={{ width: 140, height: 140 }}
                />
              ) : (
                <svg
                  className={styles.fallbackIcon}
                  viewBox="0 0 120 120"
                  aria-hidden="true"
                >
                  <circle
                    cx="60"
                    cy="60"
                    r="46"
                    fill="none"
                    stroke="#e2e8f0"
                    strokeWidth="4"
                  />
                  <path
                    d="M40 62 L54 74 L82 46"
                    fill="none"
                    stroke="#16a34a"
                    strokeWidth="6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              )}
            </div>
            <h3>¿Querés ser Socio Adherente?</h3>
            <p>
              Podés completar un formulario más corto si tu categoría es
              Adherente.
            </p>
            <div className={styles.modalActions}>
              <button
                className={styles.secondary}
                onClick={() => rf.setAskAdherente(false)}
              >
                Continuar registro
              </button>
              <button
                className={styles.primary}
                onClick={() => nav("/panel/adherente")}
              >
                Quiero ser socio adherente
              </button>
            </div>
          </div>
        </div>
      )} */}
    </>
  );
};

export default RegisterBase;
