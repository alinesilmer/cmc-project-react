// Los formateadores de números del panel: uno por forma, para no armar un `Intl.NumberFormat` en cada pantalla.

/** Pesos con centavos: `$ 1.234,50`. */
export const formatoPesos = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** Pesos sin centavos, para totales grandes: `$ 35.716.523`. */
export const formatoPesosEnteros = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  maximumFractionDigits: 0,
});

/** Importe con dos decimales y sin el símbolo, para quien ya pone el `$` aparte. */
export const formatoImporte = new Intl.NumberFormat("es-AR", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** Número entero con miles: `12.345`. */
export const formatoNumero = new Intl.NumberFormat("es-AR");

/** Número con hasta dos decimales, sin ceros de relleno. */
export const formatoNumero2 = new Intl.NumberFormat("es-AR", { maximumFractionDigits: 2 });

/** Unidades sin ceros de relleno: `17.5000` → `17,5`. */
export const formatoUnidades = new Intl.NumberFormat("es-AR", { maximumFractionDigits: 4 });
