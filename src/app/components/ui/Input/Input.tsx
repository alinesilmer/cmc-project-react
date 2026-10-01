"use client";

import type React from "react";
import styles from "./Input.module.scss";

interface InputProps {
  type?: "text" | "email" | "password" | "number" | "search";
  placeholder?: string;
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  disabled?: boolean;
  className?: string;
  icon?: React.ReactNode;
}

const Input: React.FC<InputProps> = ({
  type = "text",
  placeholder,
  value,
  onChange,
  disabled = false,
  className = "",
  icon,
}) => {
  return (
    <div className={`${styles.inputWrapper} ${className}`}>
      {icon && <div className={styles.icon}>{icon}</div>}
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        disabled={disabled}
        className={`${styles.input} ${icon ? styles.withIcon : ""}`}
      />
    </div>
  );
};

export default Input;
