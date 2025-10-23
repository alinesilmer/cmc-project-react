"use client";
import React from "react";
import styles from "./FieldWithAttach.module.scss";

type Props = {
  label: string;
  htmlFor?: string;
  error?: string;
  children: React.ReactNode;
  attach: React.ReactNode;
};

const FieldWithAttach: React.FC<Props> = ({
  label,
  htmlFor,
  error,
  children,
  attach,
}) => (
  <div className={`${styles.formGroup} ${styles.withAttach}`}>
    <div className={styles.labelRow}>
      <label htmlFor={htmlFor}>{label}</label>
    </div>
    <div className={styles.fieldRow}>
      <div className={styles.fieldGrow}>{children}</div>
      <div className={styles.attachCell}>{attach}</div>
    </div>
    {error && <span className={styles.errorText}>{error}</span>}
  </div>
);

export default FieldWithAttach;
