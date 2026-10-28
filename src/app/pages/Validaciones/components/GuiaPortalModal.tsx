import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Check, Copy, ExternalLink, Info, X } from "lucide-react";

import { getCredencialesPortal } from "../validaciones.api";
import { iniciales } from "../validaciones.types";
import type { ObraSocialConfig } from "../validaciones.types";
import s from "./GuiaPortalModal.module.scss";
import MarcoModal from "@/app/components/ui/MarcoModal/MarcoModal";
import Cargando from "@/app/components/ui/Cargando/Cargando";
import BotonPlano from "@/app/components/ui/BotonPlano/BotonPlano";

interface Props {
  os: ObraSocialConfig;
  onClose: () => void;
}

function CopiarValor({ label, valor }: { label: string; valor: string }) {
  const [copiado, setCopiado] = useState(false);

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(valor);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 1800);
    } catch {
      /* Sin permiso de portapapeles: el valor igual está a la vista. */
    }
  };

  return (
    <div>
      <span className={s.credLabel}>{label}</span>
      <div className={s.credRow}>
        <span className={s.credValor}>{valor}</span>
        <BotonPlano
          type="button"
          className={`${s.copy} ${copiado ? s.copied : ""}`}
          onClick={copiar}
          aria-label={`Copiar ${label.toLowerCase()}`}
        >
          {copiado ? <Check size={15} /> : <Copy size={15} />}
          {copiado ? "Copiado" : "Copiar"}
        </BotonPlano>
      </div>
    </div>
  );
}

/** Guía de acceso al portal de una obra social. */
export default function GuiaPortalModal({ os, onClose }: Props) {
  const guia = os.guia;

  // El usuario y la clave se piden recién al abrir la guía.
  const credenciales = useQuery({
    queryKey: ["validaciones-portal-credenciales", os.slug],
    queryFn: () => getCredencialesPortal(os.slug),
    enabled: Boolean(guia?.credencialesRemotas),
    staleTime: 0,
    gcTime: 0,
    retry: false,
  });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  if (!guia) return null;

  return (
    <MarcoModal onClose={onClose} className={s.card} aria-label={guia.titulo}>
        <div className={s.header}>
          <span className={s.logoRing} style={{ ["--os-color" as string]: os.color }}>
            {os.logo ? <img src={os.logo} alt="" /> : iniciales(os.nombre)}
          </span>
          <h2 className={s.titulo}>{guia.titulo}</h2>
          <BotonPlano type="button" className={s.close} onClick={onClose} aria-label="Cerrar">
            <X size={18} />
          </BotonPlano>
        </div>

        <div className={s.body}>
          {guia.credencialesRemotas && (
            <div className={s.credBox}>
              {credenciales.isPending ? (
                <span className={s.credEstado}>
                  <Cargando size={14} aria-hidden="true" />
                  Cargando…
                </span>
              ) : credenciales.isError || !credenciales.data?.length ? (
                <span className={s.credEstado} role="alert">
                  <Info size={14} aria-hidden="true" />
                  No disponibles. Pedilos en el Colegio.
                </span>
              ) : (
                credenciales.data.map((c) => (
                  <CopiarValor key={c.label} label={c.label} valor={c.valor} />
                ))
              )}
            </div>
          )}

          {guia.aviso && (
            <p className={s.aviso}>
              <Info size={18} />
              {guia.aviso}
            </p>
          )}

          {guia.intro && <p className={s.intro}>{guia.intro}</p>}

          <ol className={s.pasos}>
            {guia.pasos.map((paso, i) => (
              <li key={i}>
                <span className={s.pasoN}>{i + 1}</span>
                <span>{paso}</span>
              </li>
            ))}
          </ol>

          {guia.enlace && (
            <a
              className={s.enlace}
              href={guia.enlace.href}
              target="_blank"
              rel="noopener noreferrer"
            >
              <ExternalLink size={18} />
              {guia.enlace.texto}
            </a>
          )}

          {guia.pie && (
            <p className={s.pie}>
              <Info size={13} />
              {guia.pie}
            </p>
          )}
        </div>
      </MarcoModal>
  );
}
