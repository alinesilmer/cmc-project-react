"use client";

import { forwardRef } from "react";
import type { ReactNode } from "react";
import MuiBtn from "@mui/material/Button";
import type { ButtonProps as MuiButtonProps } from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import type { SxProps, Theme } from "@mui/material/styles";

/**
 * MUI-backed Button. Keeps the original in-house API and colors so every
 * existing `<Button variant="…">` call site renders a Material UI button
 * with the same look:
 *   primary = blue · secondary = yellow · third = gray/dark
 *   success = green (Excel) · danger = red (cancel/delete) · ghost = gray outline
 */
type ButtonVariant =
  | "primary"
  | "secondary"
  | "success"
  | "danger"
  | "ghost"
  | "third";

type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps
  extends Omit<MuiButtonProps, "variant" | "size" | "color"> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  submit?: boolean;
  isLoading?: boolean;
  fullWidth?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
}

const MUI_VARIANT: Record<ButtonVariant, "contained" | "outlined" | "text"> = {
  primary: "contained",
  secondary: "contained",
  third: "contained",
  success: "outlined",
  danger: "outlined",
  ghost: "outlined",
};

const VARIANT_SX: Record<ButtonVariant, SxProps<Theme>> = {
  primary: {
    backgroundColor: "#3455c1",
    color: "#ffffff",
    border: "1px solid #0c2a52",
    "&:hover": { backgroundColor: "#0c2a52" },
  },
  third: {
    backgroundColor: "#0f172a",
    color: "#ffffff",
    border: "1px solid rgba(0,0,0,0.3)",
    "&:hover": { backgroundColor: "#1e293b" },
  },
  secondary: {
    backgroundColor: "#f5eac0",
    color: "#4d441a",
    border: "1px solid #d0c182",
    "&:hover": { backgroundColor: "#d3c17a", color: "#4d4521" },
  },
  success: {
    backgroundColor: "#ffffff",
    color: "#1d9148",
    border: "1px solid rgba(29,145,72,0.32)",
    "&:hover": {
      backgroundColor: "rgba(29,145,72,0.06)",
      borderColor: "rgba(29,145,72,0.45)",
    },
  },
  danger: {
    backgroundColor: "#ffffff",
    color: "#cc2a2a",
    border: "1px solid rgba(204,42,42,0.3)",
    "&:hover": {
      backgroundColor: "rgba(204,42,42,0.05)",
      borderColor: "rgba(204,42,42,0.42)",
    },
  },
  ghost: {
    backgroundColor: "transparent",
    color: "#1e293b",
    border: "1px solid rgba(148,163,184,0.6)",
    "&:hover": {
      backgroundColor: "rgba(241,245,249,0.8)",
      borderColor: "rgba(100,116,139,0.7)",
    },
  },
};

const SIZE_SX: Record<ButtonSize, SxProps<Theme>> = {
  sm: { py: 0.5, px: 1.5, fontSize: 12, minHeight: 32 },
  md: { py: 0.85, px: 2, fontSize: "0.86rem" },
  lg: { py: 1, px: 2.5, fontSize: "1rem" },
};

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      variant = "primary",
      size = "md",
      submit,
      type,
      isLoading = false,
      fullWidth = false,
      leftIcon,
      rightIcon,
      disabled,
      sx,
      ...rest
    },
    ref
  ) => {
    return (
      <MuiBtn
        ref={ref}
        variant={MUI_VARIANT[variant]}
        type={submit ? "submit" : (type ?? "button")}
        fullWidth={fullWidth}
        disabled={disabled || isLoading}
        disableElevation
        startIcon={!isLoading ? leftIcon : undefined}
        endIcon={!isLoading ? rightIcon : undefined}
        sx={[
          {
            textTransform: "none",
            borderRadius: "8px",
            fontWeight: 600,
            boxShadow: "none",
            "&:hover": { boxShadow: "none" },
            "&.Mui-disabled": { opacity: 0.5 },
          },
          SIZE_SX[size],
          VARIANT_SX[variant],
          ...(Array.isArray(sx) ? sx : sx ? [sx] : []),
        ]}
        {...rest}
      >
        {isLoading ? <CircularProgress size={16} color="inherit" /> : children}
      </MuiBtn>
    );
  }
);

Button.displayName = "Button";

export default Button;
