import { publicarAviso, type Severidad } from "./avisos";

type Notificar = (message: string, severity?: Severidad) => void;

// Función de módulo: la identidad no cambia entre renders, así que sirve como dependencia de un efecto sin relanzarlo.
const notificar: Notificar = (message, severity = "success") =>
  publicarAviso({ severidad: severity, titulo: message, duracion: 4500 });

/** Aviso de una línea. Publica en la cola única del panel (`hooks/avisos.ts`). */
export function useAppSnackbar(): Notificar {
  return notificar;
}
