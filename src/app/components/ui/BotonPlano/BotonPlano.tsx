import type { ComponentProps } from "react";

/** El <button> del panel sin estilos propios: pasa todo tal cual (clase, type, ref, eventos). Para botones con diseño propio; el resto usa Button. */
export default function BotonPlano(props: ComponentProps<"button">) {
  // Sin "type" por defecto, a propósito: un <button> sin type dentro de un <form> envía el formulario.
  return <button {...props} />;
}
