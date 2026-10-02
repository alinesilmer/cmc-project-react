/** Pesos argentinos con centavos, como en el boletín impreso. */
export const moneda = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  minimumFractionDigits: 2,
});
