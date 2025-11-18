"use client";
import React from "react";
import styles from "./Layout.module.scss";

type StepMeta = { id: number; title: string; icon: string };

type Props = {
  steps: StepMeta[];
  currentStep: 1 | 2 | 3 | 4;
  children: React.ReactNode;
  headerCta?: React.ReactNode;
  showBack?: boolean;
  onBack?: () => void;
};

const LayoutRegister: React.FC<Props> = ({
  steps,
  currentStep,
  children,
  // headerCta,
  // showBack = false,
  // onBack,
}) => {
  return (
    <div className={styles.layout}>
      <aside className={styles.sideBar}>
        <div className={styles.progressSequence}>
          <div className={styles.logo}>
            {/* <img src="/placeholder.svg?height=60&width=100" alt="CMC" /> */}
            <h1>Registro de Socio</h1>
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
                  {currentStep > s.id ? "✓" : s.icon}
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
