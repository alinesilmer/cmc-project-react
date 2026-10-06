/** Pesos argentinos con centavos, como en el boletín impreso. */
export const moneda = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  minimumFractionDigits: 2,
});

/** Sin acentos y en minúscula, para que «prevencion» encuentre «Prevención». */
export const normalizar = (v: string): string =>
  v
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
