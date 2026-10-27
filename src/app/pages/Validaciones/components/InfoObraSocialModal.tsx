import type { ReactNode } from "react";
import { Mail, Phone, X, type LucideIcon } from "lucide-react";

import MarcoModal from "@/app/components/ui/MarcoModal/MarcoModal";
import type { ObraSocialListItem } from "@/app/pages/ObrasSociales/obrasSociales.types";
import { iniciales } from "../validaciones.types";
import DiaLimite from "./DiaLimite";
import g from "./GuiaPortalModal.module.scss";
import s from "./InfoObraSocialModal.module.scss";
import BotonPlano from "@/app/components/ui/BotonPlano/BotonPlano";

interface Props {
  os: ObraSocialListItem;
  onClose: () => void;
}

function Dato({ icono: Icono, rotulo, children }: { icono: LucideIcon; rotulo: string; children: ReactNode }) {
  return (
    <div className={s.dato}>
      <dt>
        <Icono size={18} aria-hidden="true" />
        {rotulo}
      </dt>
      <dd>{children}</dd>
    </div>
  );
}

/** Datos de una obra social sin portal ni carga en el panel, empezando por su día límite de presentación. */
export default function InfoObraSocialModal({ os, onClose }: Props) {
  return (
    <MarcoModal onClose={onClose} className={g.card} aria-label={os.nombre}>
      <div className={g.header}>
        <span className={g.logoRing}>{iniciales(os.nombre)}</span>
        <h2 className={g.titulo}>{os.nombre}</h2>
        <BotonPlano type="button" className={g.close} onClick={onClose} aria-label="Cerrar">
          <X size={18} />
        </BotonPlano>
      </div>

      <div className={g.body}>
        <DiaLimite dia={os.dia_corte ?? 20} />

        {(os.telefonos.length > 0 || os.emails.length > 0) && (
          <dl className={s.datos}>
            {os.telefonos.length > 0 && (
              <Dato icono={Phone} rotulo="Teléfono">
                {os.telefonos.map((t) => (
                  <a key={t.valor} href={`tel:${t.valor.replace(/[^\d+]/g, "")}`}>
                    {t.valor}
                    {t.etiqueta && <span className={s.etiqueta}> · {t.etiqueta}</span>}
                  </a>
                ))}
              </Dato>
            )}
            {os.emails.length > 0 && (
              <Dato icono={Mail} rotulo="Email">
                {os.emails.map((m) => (
                  <a key={m.valor} href={`mailto:${m.valor}`}>
                    {m.valor}
                    {m.etiqueta && <span className={s.etiqueta}> · {m.etiqueta}</span>}
                  </a>
                ))}
              </Dato>
            )}
          </dl>
        )}
      </div>
    </MarcoModal>
  );
}
