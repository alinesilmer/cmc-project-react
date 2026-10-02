import type React from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import styles from "./Button.module.scss";

type Comun = {
  children?: React.ReactNode;
  variant?: "primary" | "secondary" | "outline" | "default" | "ghost";
  size?: "small" | "medium" | "large" | "xlg";
  /** Ícono a la derecha del texto. */
  icon?: React.ReactNode;
  /** Ícono a la izquierda del texto (flechas de «volver», «+» de alta). */
  iconoIzquierda?: React.ReactNode;
  fullWidth?: boolean;
  className?: string;
  disabled?: boolean;
  "aria-label"?: string;
  title?: string;
};

type ComoBoton = Comun & {
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  type?: "button" | "submit" | "reset";
  to?: never;
  href?: never;
};

/** Navega dentro del sitio o del panel, sin recargar la página. */
type ComoRuta = Comun & { to: string; href?: never };

/**
 * Sale del sitio o abre algo del sistema: web, `tel:`, `mailto:`, descarga.
 * Las direcciones `http(s)` abren en otra pestaña.
 */
type ComoEnlace = Comun & {
  href: string;
  download?: boolean | string;
  /** Abre en otra pestaña aunque la dirección sea relativa (un PDF subido). */
  nuevaPestana?: boolean;
  to?: never;
};

export type ButtonProps = ComoBoton | ComoRuta | ComoEnlace;

const MotionLink = motion.create(Link);

const HOVER = { scale: 1.02 };
const TAP = { scale: 0.97 };
const SPRING = { type: "spring", stiffness: 380, damping: 28 } as const;

/**
 * Botón del sitio. Si hace falta que un botón lleve a otro lado se usa `to` o
 * `href` en vez de envolverlo en un `<a>`: un `<button>` dentro de un enlace
 * es HTML inválido, el lector de pantalla anuncia dos controles y en Socios
 * hacía que un mismo clic abriera WhatsApp y el mail a la vez.
 */
export default function Button(props: ButtonProps) {
  const {
    children,
    variant = "primary",
    size = "medium",
    icon,
    iconoIzquierda,
    fullWidth = false,
    className,
    disabled = false,
  } = props;

  const clases = [
    styles.button,
    styles[variant],
    styles[size],
    fullWidth ? styles.fullWidth : "",
    className ?? "",
  ].join(" ");

  const animacion = disabled
    ? {}
    : { whileHover: HOVER, whileTap: TAP, transition: SPRING };

  const contenido = (
    <span className={styles.content}>
      {iconoIzquierda && <span className={styles.icon}>{iconoIzquierda}</span>}
      {children}
      {icon && <span className={styles.icon}>{icon}</span>}
    </span>
  );

  const aria = { "aria-label": props["aria-label"], title: props.title };

  if ("to" in props && props.to !== undefined) {
    return (
      <MotionLink to={props.to} className={clases} aria-disabled={disabled || undefined} {...aria} {...animacion}>
        {contenido}
      </MotionLink>
    );
  }

  if ("href" in props && props.href !== undefined) {
    const externo = (props.nuevaPestana || /^https?:\/\//i.test(props.href)) && !props.download;
    return (
      <motion.a
        href={props.href}
        className={clases}
        download={props.download}
        aria-disabled={disabled || undefined}
        {...(externo ? { target: "_blank", rel: "noopener noreferrer" } : {})}
        {...aria}
        {...animacion}
      >
        {contenido}
      </motion.a>
    );
  }

  const { onClick, type = "button" } = props as ComoBoton;
  return (
    <motion.button
      type={type}
      className={clases}
      onClick={onClick}
      disabled={disabled}
      aria-disabled={disabled}
      {...aria}
      {...animacion}
    >
      {contenido}
    </motion.button>
  );
}
