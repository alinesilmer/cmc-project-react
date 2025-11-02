export const API_URL = import.meta.env.DEV ? "" : (import.meta.env.VITE_API_URL ?? "");

// if (!API_URL) {
//   // En dev es útil avisar si falta la env:
//   // eslint-disable-next-line no-console
//   console.warn("VITE_API_URL no está configurada. Definila en .env.development/.env.production");
// }