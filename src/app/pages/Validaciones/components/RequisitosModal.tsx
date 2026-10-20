import { AlertTriangle, ClipboardList, ExternalLink, Ticket, X, type LucideIcon } from "lucide-react";

import { useAuth } from "@/app/auth/AuthProvider";
import { isMedico } from "@/app/auth/roles";
import MarcoModal from "@/app/components/ui/MarcoModal/MarcoModal";
import { useObrasSociales } from "@/app/pages/ObrasSociales/useObrasSociales";
import { destinoObraSocial } from "../validaciones.config";
import { iniciales } from "../validaciones.types";
import type { ObraSocialConfig } from "../validaciones.types";
import DiaLimite from "./DiaLimite";
import g from "./GuiaPortalModal.module.scss";
import s from "./RequisitosModal.module.scss";

interface Props {
  os: ObraSocialConfig;
  onClose: () => void;
}

/** Icono de cada documento; el resto lleva el de planilla. */
const ICONOS: Record<string, LucideIcon> = {
  planilla: ClipboardList,
  bono: Ticket,
};

/** Paso previo al portal de la obra social: día límite de presentación y, si tiene, la documentación obligatoria. */
export default function RequisitosModal({ os, onClose }: Props) {
  const { user } = useAuth();
  const requisitos = os.requisitos;
  const { href, tipo } = destinoObraSocial(os, isMedico(user));

  // El día límite sale del catálogo; las del portal pueden no tener código propio y sólo «otrosCodigos».
  const catalogo = useObrasSociales();
  const codigos = [os.codigo, ...(os.otrosCodigos ?? [])].filter((c): c is number => c != null);
  const ficha = catalogo.data?.find((o) => codigos.includes(o.nro_obra_social));
  const dia = ficha ? (ficha.dia_corte ?? 20) : null;

  return (
    <MarcoModal onClose={onClose} className={g.card} aria-label={requisitos?.titulo ?? os.nombre}>
      <div className={g.header}>
        <span className={g.logoRing} style={{ ["--os-color" as string]: os.color }}>
          {os.logo ? <img src={os.logo} alt="" /> : iniciales(os.nombre)}
        </span>
        <h2 className={g.titulo}>{os.nombre}</h2>
        <button type="button" className={g.close} onClick={onClose} aria-label="Cerrar">
          <X size={18} />
        </button>
      </div>

      <div className={g.body}>
        {dia != null && <DiaLimite dia={dia} />}

        {requisitos && (
          <>
            <h3 className={s.subtitulo}>{requisitos.titulo}</h3>
            <ul className={s.items}>
              {requisitos.items.map((item) => {
                const Icono = ICONOS[item.toLowerCase()] ?? ClipboardList;
                return (
                  <li key={item} className={s.item}>
                    <span className={s.icono}>
                      <Icono size={30} strokeWidth={1.8} aria-hidden="true" />
                    </span>
                    <span className={s.nombre}>{item}</span>
                    <span className={s.sello}>Obligatorio</span>
                  </li>
                );
              })}
            </ul>

            <p className={s.motivo} role="alert">
              <AlertTriangle size={22} aria-hidden="true" />
              {requisitos.motivo}
            </p>
          </>
        )}

        <a
          className={g.enlace}
          href={href}
          {...(tipo === "portal" ? { target: "_blank", rel: "noopener noreferrer" } : {})}
          onClick={onClose}
        >
          <ExternalLink size={18} />
          Entendido, ir a {os.nombre}
        </a>
      </div>
    </MarcoModal>
  );
}
