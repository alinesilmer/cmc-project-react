// CBU y medio de cobro del socio. Espejo de app/common/cbu.py de la API: la API es la que
// manda, esto solo avisa antes de enviar.

export type MedioCobro = "santander" | "otros_bancos" | "cheque";

export const MEDIOS_COBRO: { value: MedioCobro; label: string }[] = [
  { value: "santander", label: "Santander" },
  { value: "otros_bancos", label: "Otros bancos" },
  { value: "cheque", label: "Cheque" },
];

export const etiquetaMedioCobro = (m?: string | null): string =>
  MEDIOS_COBRO.find((x) => x.value === m)?.label ?? "—";

export const ENTIDAD_SANTANDER = "072";

const PESOS_1 = [7, 1, 3, 9, 7, 1, 3];
const PESOS_2 = [3, 9, 7, 1, 3, 9, 7, 1, 3, 9, 7, 1, 3];

const digito = (pesos: number[], digitos: string): number =>
  (10 - (pesos.reduce((acc, p, i) => acc + Number(digitos[i]) * p, 0) % 10)) % 10;

/** 22 dígitos y los dos dígitos verificadores correctos (algoritmo del BCRA). */
export function esCbuValido(valor?: string | null): boolean {
  const s = (valor ?? "").trim();
  if (!/^\d{22}$/.test(s)) return false;
  return digito(PESOS_1, s.slice(0, 7)) === Number(s[7]) && digito(PESOS_2, s.slice(8, 21)) === Number(s[21]);
}

export const esCbuSantander = (valor?: string | null): boolean => (valor ?? "").trim().startsWith(ENTIDAD_SANTANDER);

/** Mensaje de error para un CBU cargado en el campo de Santander o de otro banco; "" si está bien o vacío. */
export function errorCbu(valor: string | null | undefined, banco: "santander" | "otro"): string {
  const s = (valor ?? "").trim();
  if (!s) return "";
  if (!esCbuValido(s)) return "No es un CBU válido: tienen que ser 22 dígitos con el dígito verificador correcto.";
  if (banco === "santander" && !esCbuSantander(s)) return "No es de Santander (tiene que empezar con 072). Cargalo en «Otro banco».";
  if (banco === "otro" && esCbuSantander(s)) return "Es de Santander (empieza con 072). Cargalo en «CBU Santander».";
  return "";
}
