"use client";

import type React from "react";

import { motion } from "framer-motion";
import styles from "./Button.module.scss";

interface ButtonProps {
  children?: React.ReactNode;
  onClick?: () => void;
  variant: "primary" | "secondary" | "outline";
  size: "small" | "medium" | "large";
  icon?: React.ReactNode;
  type?: "button" | "submit" | "reset";
  disabled?: boolean;
  fullWidth?: boolean;
}

export default function Button({
  children,
  onClick,
  variant = "primary",
  size = "medium",
  icon,
  type = "button",
  disabled = false,
  fullWidth = false,
}: ButtonProps) {
  return (
    <motion.button
      className={`${styles.button} ${styles[variant]} ${styles[size]} ${
        fullWidth ? styles.fullWidth : ""
      }`}
      onClick={onClick}
      type={type}
      disabled={disabled}
      whileHover={{ scale: disabled ? 1 : 1.05 }}
      whileTap={{ scale: disabled ? 1 : 0.95 }}
      transition={{ duration: 0.2 }}
    >
      <span className={styles.content}>
        {children}
        {icon && <span className={styles.icon}>{icon}</span>}
      </span>
    </motion.button>
  );
}
