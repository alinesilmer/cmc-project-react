import type React from "react";
import { Link } from "react-router-dom";

type Props = {
  href: string;
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  "aria-label"?: string;
  role?: string;
};

const esExterno = (href: string) => /^https?:\/\//i.test(href);

/**
 * Un enlace que decide solo: las rutas del sitio van con `<Link>` (sin
 * recargar) y las direcciones externas con `<a>` en otra pestaña y sin
 * `window.opener`. La misma decisión estaba escrita a mano en las tarjetas de
 * servicios, los accesos rápidos y el chatbot.
 */
export default function Enlace({ href, children, ...resto }: Props) {
  if (esExterno(href)) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" {...resto}>
        {children}
      </a>
    );
  }
  return (
    <Link to={href} {...resto}>
      {children}
    </Link>
  );
}
