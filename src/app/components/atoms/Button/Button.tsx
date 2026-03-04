"use client";

import type React from "react";
import { forwardRef } from "react";
import styles from "./Button.module.scss";

type ButtonVariant =
  | "primary"
  | "secondary"
  | "success"
  | "danger"
  | "ghost"
  | "third";

type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  submit?: boolean;
  isLoading?: boolean;
  fullWidth?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  className?: string;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      variant = "primary",
      size = "md",
      disabled = false,
      type = "button",
      submit,
      isLoading = false,
      fullWidth = false,
      leftIcon,
      rightIcon,
      className = "",
      ...rest
    },
    ref
  ) => {
    const computedType: "button" | "submit" | "reset" = submit
      ? "submit"
      : type;

    const isDisabled = disabled || isLoading;

    const buttonClassName = [
      styles.button,
      styles[variant],
      styles[size],
      fullWidth ? styles.fullWidth : "",
      isLoading ? styles.loading : "",
      className,
    ]
      .filter(Boolean)
      .join(" ");

    return (
      <button
        ref={ref}
        className={buttonClassName}
        type={computedType}
        disabled={isDisabled}
        aria-busy={isLoading || undefined}
        {...rest}
      >
        {isLoading ? (
          <span className={styles.spinner} aria-hidden="true" />
        ) : leftIcon ? (
          <span className={styles.icon} aria-hidden="true">
            {leftIcon}
          </span>
        ) : null}

        <span className={styles.content}>{children}</span>

        {!isLoading && rightIcon ? (
          <span className={styles.icon} aria-hidden="true">
            {rightIcon}
          </span>
        ) : null}
      </button>
    );
  }
);

Button.displayName = "Button";

export default Button;