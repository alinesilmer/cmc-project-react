"use client";
import React from "react";
import LayoutRegister from "./Layout/Layout";
import Steps from "./Steps/Steps";
import styles from "./RegisterBase.module.scss";
import { useNavigate } from "react-router-dom";
import { useRegisterForm } from "@/app/features/registro/hooks/useRegisterForm";
import Button from "@/app/components/ui/Button/Button";
import type { LucideIcon } from "lucide-react";

type Props = {
  mode: "public" | "admin";
  stepsMeta: { id: number; title: string; icon: LucideIcon }[];
  specialties: { id: number; id_colegio_espe: number; nombre: string }[];
};

const RegisterBase: React.FC<Props> = ({
  mode,
  stepsMeta,
  specialties
}) => {
  const nav = useNavigate();
  const rf = useRegisterForm(mode);

  return (
    <>
      <LayoutRegister
        steps={stepsMeta}
        currentStep={rf.step}
        onBack={rf.prevStep}
        showBack={rf.step > 1}
        variante={mode === "admin" ? "panel" : undefined}
        titulo="Nuevo socio"
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
          sinAyuda={mode === "admin"}
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
          {mode === "admin" ? (
            // En el panel "Cancelar" va acá abajo, con el resto de las acciones; la barra de arriba se oculta por CSS.
            <div className={styles.navIzquierda}>
              <Button
                variant="ghost"
                size="md"
                onClick={() => nav("/panel/dashboard")}
              >
                Cancelar
              </Button>
              {rf.step > 1 && (
                <Button variant="ghost" size="md" onClick={rf.prevStep}>
                  ← Atrás
                </Button>
              )}
            </div>
          ) : rf.step > 1 ? (
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
