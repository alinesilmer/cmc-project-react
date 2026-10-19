import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Check, Copy, Info, X } from "lucide-react";

import { CMC_EMAIL, CMC_NAME, CMC_PHONE } from "@/app/shared/lib/documentos/institucion";
import { useDialogo } from "./useDialogo";
// Mismo marco que «Datos a mostrar» y el recuento.
import marco from "./ExportFieldsModal.module.scss";
import s from "./Padrones.module.scss";
import MarcoModal from "@/app/components/ui/MarcoModal/MarcoModal";

type Props = {
  open: boolean;
  onClose: () => void;
  obraSocial: string;
  /** Cuántos prestadores tiene la lista que se va a enviar. */
  cantidad: number;
};

const hoy = () =>
  new Date().toLocaleDateString("es-AR", { day: "numeric", month: "long", year: "numeric" });

/** El correo modelo. Corto a propósito: se lee de un vistazo y se ajusta rápido. */
function redactar(obraSocial: string, cantidad: number): string {
  return [
    `Asunto: Padrón de prestadores — ${obraSocial}`,
    "",
    `Sres. ${obraSocial}:`,
    "",
    `Adjuntamos el padrón vigente de prestadores del ${CMC_NAME} al ${hoy()}: ${cantidad} profesionales.`,
    "",
    "Solicitamos actualizar sus registros con esta nómina. Ante cualquier diferencia, quedamos a disposición.",
    "",
    "Saludos cordiales.",
    "",
    CMC_NAME,
    `Tel. ${CMC_PHONE} · ${CMC_EMAIL}`,
  ].join("\n");
}

/** Texto formal listo para pegar en el correo con el que se envía la lista de prestadores a la obra social. */
export default function EnvioModal({ open, onClose, obraSocial, cantidad }: Props) {
  const panelRef = useDialogo(open, onClose);
  const [texto, setTexto] = useState("");
  const [copiado, setCopiado] = useState(false);

  // Cada vez que se abre arranca del modelo, con la obra social del momento.
  useEffect(() => {
    if (!open) return;
    setTexto(redactar(obraSocial, cantidad));
    setCopiado(false);
  }, [open, obraSocial, cantidad]);

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(texto);
      setCopiado(true);
    } catch {
      // Sin permiso de portapapeles: el texto queda a la vista para copiarlo a mano.
      setCopiado(false);
    }
  };

  if (!open) return null;

  return createPortal(
    <MarcoModal onClose={onClose} ref={panelRef} className={marco.panel} aria-labelledby="envio-titulo">
        <header className={marco.head}>
          <h2 id="envio-titulo" className={marco.title}>Envío de lista de prestadores</h2>
          <button type="button" className={marco.close} onClick={onClose} aria-label="Cerrar">
            <X size={18} />
          </button>
        </header>

        <div className={marco.body}>
          <textarea
            className={s.envioTexto}
            value={texto}
            onChange={(e) => {
              setTexto(e.target.value);
              setCopiado(false);
            }}
            rows={14}
            aria-label="Texto del correo"
            spellCheck
          />
        </div>

        <footer className={marco.foot}>
          <div className={marco.notes}>
            <span className={marco.note}>
              <Info size={12} aria-hidden="true" />
              Copialo, pegalo en tu correo y adjuntá el PDF o el Excel.
            </span>
          </div>
          <button type="button" className={marco.done} onClick={copiar}>
            {copiado ? <Check size={15} aria-hidden="true" /> : <Copy size={15} aria-hidden="true" />}
            {copiado ? " Copiado" : " Copiar"}
          </button>
        </footer>
      </MarcoModal>,
    document.body,
  );
}
