"use client";
import React from "react";
import { Check, UserPlus } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import Franja from "@/app/components/layout/Franja/Franja";
import styles from "./Layout.module.scss";

type StepMeta = { id: number; title: string; icon: LucideIcon };

type Props = {
  steps: StepMeta[];
  currentStep: 1 | 2 | 3 | 4;
  children: React.ReactNode;
  headerCta?: React.ReactNode;
  showBack?: boolean;
  onBack?: () => void;
  /** "panel": el alta que hace el Colegio desde adentro del panel. */
  variante?: "panel";
  /** Título de la pantalla en la variante "panel". */
  titulo?: string;
};

const LayoutRegister: React.FC<Props> = ({
  steps,
  currentStep,
  children,
  variante,
  titulo = "Registro",
  // headerCta, showBack = false, onBack,
}) => {
  if (variante === "panel") {
    const indice = Math.max(
      0,
      steps.findIndex((s) => s.id === currentStep),
    );
    const IconoActual = steps[indice]?.icon;

    return (
      <>
        <Franja
          suelta
          titulo={titulo}
          icono={UserPlus}
          lateral={
            <span className={styles.pPaso}>
              {currentStep} / {steps.length}
            </span>
          }
        />
        <div className={styles.panel} data-variante="panel">
          <ol className={styles.pSteps}>
            {steps.map((s) => {
              const Icono = s.icon;
              const activo = currentStep === s.id;
              const hecho = currentStep > s.id;
              return (
                <li
                  key={s.id}
                  className={`${styles.pStep} ${activo ? styles.pStepOn : ""} ${
                    hecho ? styles.pStepHecho : ""
                  }`}
                  aria-current={activo ? "step" : undefined}
                >
                  <span className={styles.pStepIcon}>
                    {hecho ? (
                      <Check size={18} aria-hidden="true" />
                    ) : (
                      <Icono size={18} aria-hidden="true" />
                    )}
                  </span>
                  <span className={styles.pStepTitle}>{s.title}</span>
                </li>
              );
            })}
          </ol>

          <section className={styles.pCard}>
            <h2 className={styles.pCardTitle}>
              {IconoActual && <IconoActual size={16} aria-hidden="true" />}
              {steps[indice]?.title}
            </h2>
            <div className={styles.pBody}>{children}</div>
          </section>
        </div>
      </>
    );
  }

  return (
    <div className={styles.layout}>
      <aside className={styles.sideBar}>
        <div className={styles.progressSequence}>
          <div className={styles.logo}>
            {/* <img src="/placeholder.svg?height=60&width=100" alt="CMC" /> */}
            <h1>Registro</h1>
          </div>

          <div className={styles.stepsList}>
            {steps.map((s) => (
              <div
                key={s.id}
                className={`${styles.stepItem} ${
                  currentStep === s.id
                    ? styles.active
                    : currentStep > s.id
                      ? styles.completed
                      : ""
                }`}
              >
                <div className={styles.stepIcon}>
                  {currentStep > s.id ? (
                    <Check size={20} aria-hidden="true" />
                  ) : (
                    <s.icon size={20} aria-hidden="true" />
                  )}
                </div>
                <div className={styles.stepInfo}>
                  <div className={styles.stepNumber}>Paso {s.id}</div>
                  <div className={styles.stepTitle}>{s.title}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </aside>

      <main className={styles.main}>
        <section className={styles.body}>{children}</section>
      </main>
    </div>
  );
};

export default LayoutRegister;
