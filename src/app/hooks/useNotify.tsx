import type { ReactNode } from "react";

import { publicarAviso, type Severidad } from "./avisos";

type Opts = { duration?: number };
type Notificar = (title: ReactNode, body?: ReactNode, opts?: Opts) => void;

const DURACION = 4000;

const con =
  (severidad: Severidad): Notificar =>
  (title, body, opts) =>
    publicarAviso({ severidad, titulo: title, cuerpo: body, duracion: opts?.duration ?? DURACION });

// Objeto de módulo: es el mismo en cada render, y sus funciones también.
const notify = {
  success: con("success"),
  info: con("info"),
  warning: con("warning"),
  error: con("error"),
};

/** Aviso con título y, si hace falta, una segunda línea. */
export function useNotify() {
  return notify;
}
