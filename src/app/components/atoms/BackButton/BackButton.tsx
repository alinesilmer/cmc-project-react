"use client";
import React from "react";
import { useNavigate } from "react-router-dom";
import styles from "./BackButton.module.scss";

const BackButton: React.FC<{ label?: string; to?: string | number }> = ({
  label = "← Volver",
  to = -1,
}) => {
  const navigate = useNavigate();
  return (
    <button
      className={styles.backButton}
      onClick={() => (typeof to === "number" ? navigate(to) : navigate(to))}
      type="button"
    >
      {label}
    </button>
  );
};

export default BackButton;
