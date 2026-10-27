import { KeyRound } from "lucide-react";

import { useAuth } from "@/app/auth/useAuth";
import { isMedico } from "@/app/auth/roles";
import { destinoObraSocial } from "../validaciones.config";
import type { ObraSocialConfig } from "../validaciones.types";
import Carpeta from "./Carpeta";
import s from "./ObraSocialCard.module.scss";

interface Props {
  os: ObraSocialConfig;
  onAbrirGuia?: (os: ObraSocialConfig) => void;
  /** Abre el paso previo (día límite y documentación) en lugar del portal. */
  onRequisitos?: (os: ObraSocialConfig) => void;
}

export default function ObraSocialCard({ os, onAbrirGuia, onRequisitos }: Props) {
  const { user } = useAuth();
  const { href, tipo } = destinoObraSocial(os, isMedico(user));

  return (
    <Carpeta
      nombre={os.nombre}
      logo={os.logo}
      href={href}
      externo={tipo === "portal"}
      deshabilitada={os.estado === "mantenimiento"}
      aviso="En mantenimiento"
      onAbrir={(tipo === "portal" || os.requisitos) && onRequisitos ? () => onRequisitos(os) : undefined}
    >
      {os.guia && onAbrirGuia && (
        <button
          type="button"
          className={s.guiaChip}
          onClick={() => onAbrirGuia(os)}
          aria-label={`${os.guia.chip} de ${os.nombre}`}
        >
          <KeyRound size={16} />
          {os.guia.chip}
        </button>
      )}
    </Carpeta>
  );
}
