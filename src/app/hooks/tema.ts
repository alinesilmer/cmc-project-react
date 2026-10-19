import { crearPreferencia } from "./preferencia";

/** El tema del panel (claro u oscuro). */
export type Tema = "claro" | "oscuro";

const TEMAS: readonly Tema[] = ["claro", "oscuro"];

const preferencia = crearPreferencia<Tema>("cmc:tema", TEMAS, "claro");

export const elegirTema = preferencia.elegir;
export const useTema = preferencia.useValor;

/** El oscuro depende de `light-dark()` (Chrome y Edge 123, Firefox 120, Safari 17.5). */
export const TEMA_OSCURO_DISPONIBLE =
  typeof CSS !== "undefined" && CSS.supports("color", "light-dark(#000, #fff)");
