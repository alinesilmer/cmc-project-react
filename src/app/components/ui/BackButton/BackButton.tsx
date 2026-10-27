"use client";
import React from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import styles from "./BackButton.module.scss";
import BotonPlano from "@/app/components/ui/BotonPlano/BotonPlano";

type Props = {
  label?: string;
  to?: string | number;
  /** Volver dentro de la misma pantalla: reemplaza a la navegación. */
  onClick?: () => void;
};

const BackButton: React.FC<Props> = ({ label = "Volver", to = -1, onClick }) => {
  const navigate = useNavigate();
  return (
    <BotonPlano
      className={styles.backButton}
      onClick={onClick ?? (() => (typeof to === "number" ? navigate(to) : navigate(to)))}
      type="button"
    >
      <ArrowLeft size={16} strokeWidth={2.2} aria-hidden="true" />
      <span>{label}</span>
    </BotonPlano>
  );
};

export default BackButton;
