// Un PDF por solapa del boletín.

import { consulta } from "./consulta";
import { galenos } from "./galenos";
import { observaciones } from "./observaciones";
import { pediatria } from "./pediatria";
import type { SeccionPdf } from "./base";

export type IdSeccion = "consulta" | "pediatria" | "galenos" | "observaciones";

export const SECCIONES: Record<IdSeccion, SeccionPdf> = { consulta, pediatria, galenos, observaciones };

export { descargarSeccion } from "./base";
