export const LARGO_MINIMO = 6;

export type DatosPassword = { actual: string; nueva: string; repetir: string };

/** Qué le falta a la contraseña nueva, tildándose a medida que se escribe. */
export function requisitosPassword({ actual, nueva, repetir }: DatosPassword) {
  return [
    { texto: `Al menos ${LARGO_MINIMO} caracteres`, ok: nueva.length >= LARGO_MINIMO },
    { texto: "Distinta de la actual", ok: Boolean(nueva) && nueva !== actual },
    { texto: "Las dos nuevas coinciden", ok: Boolean(repetir) && nueva === repetir },
  ];
}
