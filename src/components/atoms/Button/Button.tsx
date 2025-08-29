"use client";

import type React from "react";
import { motion } from "framer-motion";
import styles from "./Button.module.scss";

interface ButtonProps {
  children: React.ReactNode;
  variant?: "primary" | "secondary" | "success" | "danger" | "ghost";
  size?: "sm" | "md" | "lg";
  disabled?: boolean;
  onClick?: () => void;
  type?: "button" | "submit" | "reset";
  className?: string;
}

const Button: React.FC<ButtonProps> = ({
  children,
  variant = "primary",
  size = "md",
  disabled = false,
  onClick,
  type = "button",
  className = "",
}) => {
  return (
    <motion.button
      className={`${styles.button} ${styles[variant]} ${styles[size]} ${className}`}
      onClick={onClick}
      disabled={disabled}
      type={type}
      whileHover={{ scale: disabled ? 1 : 0.9 }}
      whileTap={{ scale: disabled ? 1 : 0.85 }}
      transition={{ duration: 0.01 }}
    >
      {children}
    </motion.button>
  );
};

export default Button;
