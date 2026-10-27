import { CreditCard, KeyRound, Stethoscope, UserRound } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import type { CampoConfig, ObraSocialConfig } from "../validaciones.types";

/** La carga se hace de a una pregunta por vez. */
type Grupo = "afiliado" | "clave" | "practica";

export interface PasoCarga {
  id: Grupo | "medico";
  /** Rótulo corto de la línea de avance. */
  titulo: string;
  icono: LucideIcon;
  campos: CampoConfig[];
}

const GRUPO_DE: Record<string, Grupo> = {
  nombreAfiliado: "afiliado",
  nroAfiliado: "afiliado",
  dni: "afiliado",
  token: "clave",
  nroValidacion: "clave",
};

const ICONO: Record<Grupo, LucideIcon> = {
  afiliado: CreditCard,
  clave: KeyRound,
  practica: Stethoscope,
};

/** El paso previo del personal del Colegio: a nombre de quién se carga. */
export const PASO_MEDICO: PasoCarga = { id: "medico", titulo: "Médico", icono: UserRound, campos: [] };

function tituloDe(grupo: Grupo, campos: CampoConfig[]): string {
  if (grupo === "afiliado") return campos.every((c) => c.name === "dni") ? "DNI afiliado" : "Afiliado";
  if (grupo === "practica") return "Práctica";
  // El token sale de la credencial; el número de validación, del portal.
  return campos.some((c) => c.name === "token") ? "Token" : "Autorización";
}

export function armarPasos(os: ObraSocialConfig): PasoCarga[] {
  const porGrupo = new Map<Grupo, CampoConfig[]>();
  for (const campo of os.campos ?? []) {
    // Lo que no es del afiliado ni de la autorización describe la práctica (código, cantidad, coseguro).
    const grupo = GRUPO_DE[campo.name] ?? "practica";
    porGrupo.set(grupo, [...(porGrupo.get(grupo) ?? []), campo]);
  }
  return [...porGrupo].map(([grupo, campos]) => ({
    id: grupo,
    titulo: tituloDe(grupo, campos),
    icono: ICONO[grupo],
    campos,
  }));
}
