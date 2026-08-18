import { useEffect, useState } from "react";
import { Check, Copy, ExternalLink, Info, X } from "lucide-react";

import { iniciales } from "../validaciones.types";
import type { ObraSocialConfig } from "../validaciones.types";
import s from "./GuiaPortalModal.module.scss";

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
        <button
          type="button"
          className={`${s.copy} ${copiado ? s.copied : ""}`}
          onClick={copiar}
          aria-label={`Copiar ${label.toLowerCase()}`}
        >
          {copiado ? <Check size={13} /> : <Copy size={13} />}
          {copiado ? "Copiado" : "Copiar"}
        </button>
      </div>
    </div>
  );
}

/**
 * Guía de acceso al portal de una obra social. Reemplaza los modales
 * `modalSwissGuide` y `modalUnionGuide` de `menu.php`.
 */
export default function GuiaPortalModal({ os, onClose }: Props) {
  const guia = os.guia;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  if (!guia) return null;

  return (
    <div
      className={s.overlay}
      role="dialog"
      aria-modal="true"
      aria-label={guia.titulo}
      onClick={onClose}
    >
      <div className={s.card} onClick={(e) => e.stopPropagation()}>
        <div className={s.header}>
          <span className={s.logoRing} style={{ ["--os-color" as string]: os.color }}>
            {os.logo ? <img src={os.logo} alt="" /> : iniciales(os.nombre)}
          </span>
          <h2 className={s.titulo}>{guia.titulo}</h2>
          <button type="button" className={s.close} onClick={onClose} aria-label="Cerrar">
            <X size={18} />
          </button>
        </div>

        <div className={s.body}>
          {guia.credenciales && guia.credenciales.length > 0 && (
            <div className={s.credBox}>
              {guia.credenciales.map((c) => (
                <CopiarValor key={c.label} label={c.label} valor={c.valor} />
              ))}
            </div>
          )}

          {guia.aviso && (
            <p className={s.aviso}>
              <Info size={15} />
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
              <ExternalLink size={15} />
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
      </div>
    </div>
  );
}
