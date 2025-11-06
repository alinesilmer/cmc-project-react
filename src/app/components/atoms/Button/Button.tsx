"use client";

import type React from "react";
import { motion } from "framer-motion";
import styles from "./Button.module.scss";

interface ButtonProps {
  children: React.ReactNode;
  variant?: "primary" | "secondary" | "success" | "danger" | "ghost";
  size?: "sm" | "md" | "lg" | "xlg";
  disabled?: boolean;
  onClick?: React.MouseEventHandler<HTMLButtonElement>;
  onPointerDown?: React.PointerEventHandler<HTMLButtonElement>;
  onMouseDown?: React.MouseEventHandler<HTMLButtonElement>;
  type?: "button" | "submit" | "reset";
  className?: string;
  submit?: boolean;
  [key: string]: any;
}

const Button: React.FC<ButtonProps> = ({
  children,
  variant = "primary",
  size = "md",
  disabled = false,
  onClick,
  onPointerDown,
  onMouseDown,
  type = "button",
  submit,
  className = "",
  ...rest
}) => {
  const computedType: "button" | "submit" | "reset" = submit ? "submit" : (type ?? "button");
  return (
    <motion.button
      className={`${styles.button} ${styles[variant]} ${styles[size]} ${className}`}
      type={computedType}
      disabled={disabled}
      onClick={onClick}
      onPointerDown={onPointerDown}
      onMouseDown={onMouseDown}
      whileHover={{ scale: disabled ? 1 : 0.9 }}
      whileTap={{ scale: disabled ? 1 : 0.85 }}
      transition={{ duration: 0.01 }}
      {...rest}
    >
      {children}
    </motion.button>
  );
};

export default Button;
