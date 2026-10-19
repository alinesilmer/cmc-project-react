import { crearPreferencia } from "./preferencia";

/** El tamaño del texto del panel, para quien ve con dificultad. */
export const TEXTO_TAMANOS = ["normal", "grande", "muy-grande"] as const;
export type TextoTamano = (typeof TEXTO_TAMANOS)[number];

// La escala vive en `styles/tema.scss`, atada a `data-texto` de la raíz.
function marcarRaiz(tamano: TextoTamano): void {
  const raiz = document.documentElement;
  if (tamano === "normal") delete raiz.dataset.texto;
  else raiz.dataset.texto = tamano;
}

const preferencia = crearPreferencia<TextoTamano>("cmc:texto", TEXTO_TAMANOS, "normal", marcarRaiz);

export const elegirTextoTamano = preferencia.elegir;
export const useTextoTamano = preferencia.useValor;

/** Pasa al tamaño siguiente (normal → grande → muy grande → normal), sobre lo que hay guardado en este instante. */
export function pasarAlSiguienteTexto(): void {
  const i = TEXTO_TAMANOS.indexOf(preferencia.leer());
  preferencia.elegir(TEXTO_TAMANOS[(i + 1) % TEXTO_TAMANOS.length]);
}
