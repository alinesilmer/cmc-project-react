import type React from "react";
import { motion } from "framer-motion";
import styles from "./Button.module.scss";

interface ButtonProps {
  children?: React.ReactNode;
  onClick?: () => void;
  variant?: "primary" | "secondary" | "outline" | "default" | "ghost";
  size?: "small" | "medium" | "large" | "xlg";
  icon?: React.ReactNode;
  type?: "button" | "submit" | "reset";
  disabled?: boolean;
  fullWidth?: boolean;
  className?: string;
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
  className,
}: ButtonProps) {
  return (
    <motion.button
      className={`${styles.button} ${styles[variant ?? "primary"]} ${styles[size ?? "medium"]} ${
        fullWidth ? styles.fullWidth : ""
      } ${className ?? ""}`}
      onClick={onClick}
      type={type}
      disabled={disabled}
      aria-disabled={disabled}
      whileHover={{ scale: disabled ? 1 : 1.02 }}
      whileTap={{ scale: disabled ? 1 : 0.97 }}
      transition={{ type: "spring", stiffness: 380, damping: 28 }}
    >
      <span className={styles.content}>
        {children}
        {icon && <span className={styles.icon}>{icon}</span>}
      </span>
    </motion.button>
  );
}
