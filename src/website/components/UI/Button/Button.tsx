import type React from "react";
import { Link } from "react-router-dom";
import styles from "./Button.module.scss";

type Comun = {
  children?: React.ReactNode;
  /** `plano`: sin aspecto propio, sólo el `className` de quien lo usa (chips, flechas, cerrar). */
  variant?: "primary" | "secondary" | "outline" | "default" | "ghost" | "plano";
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

/** Como botón acepta cualquier atributo nativo (ARIA, foco, `ref`), para no tener que escribir un `<button>` suelto. */
type ComoBoton = Comun &
  Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, keyof Comun | "type"> & {
    type?: "button" | "submit" | "reset";
    ref?: React.Ref<HTMLButtonElement>;
    to?: never;
    href?: never;
  };

/** Navega dentro del sitio o del panel, sin recargar la página. */
type ComoRuta = Comun & { to: string; href?: never };

/** Sale del sitio o abre algo del sistema: web, `tel:`, `mailto:`, descarga. */
type ComoEnlace = Comun & {
  href: string;
  download?: boolean | string;
  /** Abre en otra pestaña aunque la dirección sea relativa (un PDF subido). */
  nuevaPestana?: boolean;
  to?: never;
};

export type ButtonProps = ComoBoton | ComoRuta | ComoEnlace;

/** Botón del sitio. Si hace falta que un botón lleve a otro lado se usa `to` o `href` en vez de envolverlo en un… */
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

  const plano = variant === "plano";
  const clases = plano
    ? (className ?? "")
    : [styles.button, styles[variant], styles[size], fullWidth ? styles.fullWidth : "", className ?? ""].join(" ");

  // El plano no envuelve: su contenido queda tal cual, para que la hoja de quien lo usa lo acomode.
  const contenido = plano ? (
    <>
      {iconoIzquierda}
      {children}
      {icon}
    </>
  ) : (
    <span className={styles.content}>
      {iconoIzquierda && <span className={styles.icon}>{iconoIzquierda}</span>}
      {children}
      {icon && <span className={styles.icon}>{icon}</span>}
    </span>
  );

  const aria = { "aria-label": props["aria-label"], title: props.title };

  if ("to" in props && props.to !== undefined) {
    return (
      <Link to={props.to} className={clases} aria-disabled={disabled || undefined} {...aria}>
        {contenido}
      </Link>
    );
  }

  if ("href" in props && props.href !== undefined) {
    const externo = (props.nuevaPestana || /^https?:\/\//i.test(props.href)) && !props.download;
    return (
      <a
        href={props.href}
        className={clases}
        download={props.download}
        aria-disabled={disabled || undefined}
        {...(externo ? { target: "_blank", rel: "noopener noreferrer" } : {})}
        {...aria}
      >
        {contenido}
      </a>
    );
  }

  // Lo que no es propio del componente pasa directo al <button>.
  const {
    children: _hijos,
    variant: _variante,
    size: _tamano,
    icon: _icono,
    iconoIzquierda: _iconoIzquierda,
    fullWidth: _anchoTotal,
    className: _clase,
    disabled: _deshabilitado,
    to: _to,
    href: _href,
    type = "button",
    ...nativos
  } = props as ComoBoton;
  return (
    <button {...nativos} type={type} className={clases} disabled={disabled} aria-disabled={disabled}>
      {contenido}
    </button>
  );
}
