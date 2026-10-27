import { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { CheckCircle2, Info, X } from "lucide-react";

import ListaChequeos from "@/app/pages/UsersList/components/ListaChequeos/ListaChequeos";
import type { ExportField, ExportRow } from "./types";
import { pickNombre, pickNroPrestador } from "./helpers";
import { recontar } from "./recuento";
import { useDialogo } from "./useDialogo";
// Mismo marco que «Datos a mostrar»: fondo, panel, cabecera y pie.
import marco from "./ExportFieldsModal.module.scss";
import s from "./RecuentoModal.module.scss";;
import BotonVer from "@/app/components/ui/BotonVer/BotonVer";
import MarcoModal from "@/app/components/ui/MarcoModal/MarcoModal";
import BotonPlano from "@/app/components/ui/BotonPlano/BotonPlano";

const LIMITE_DETALLE = 50;

type Props = {
  open: boolean;
  onClose: () => void;
  /** Nombre de la obra social, para el título. */
  obraSocial: string;
  filas: ExportRow[];
  campos: ExportField[];
  /** Todavía se están leyendo las fichas: los faltantes de esas columnas no son reales. */
  fichasPendientes: boolean;
  onVer: (id: unknown) => void;
};

/** Recuento de errores del padrón en pantalla: duplicados y datos que faltan en las columnas elegidas. */
export default function RecuentoModal({
  open, onClose, obraSocial, filas, campos, fichasPendientes, onVer,
}: Props) {
  const panelRef = useDialogo(open, onClose);
  const [abierto, setAbierto] = useState<string | null>(null);

  // Se calcula sólo con el panel abierto: recorrer el padrón por cada columna no hace falta mientras nadie lo mira.
  const chequeos = useMemo(() => (open ? recontar(filas, campos) : []), [open, filas, campos]);
  const observados = useMemo(
    () => new Set(chequeos.flatMap((c) => c.filas)).size,
    [chequeos],
  );

  if (!open) return null;

  return createPortal(
    <MarcoModal onClose={onClose} ref={panelRef} className={marco.panel} aria-labelledby="recuento-titulo">
        <header className={marco.head}>
          <h2 id="recuento-titulo" className={marco.title}>Recuento de errores · {obraSocial}</h2>
          <BotonPlano type="button" className={marco.close} onClick={onClose} aria-label="Cerrar">
            <X size={18} />
          </BotonPlano>
        </header>

        <div className={marco.body}>
          <p className={s.recuentoResumen}>
            {observados === 0 ? (
              <>
                <CheckCircle2 size={16} aria-hidden="true" /> Sin observaciones en {filas.length} prestadores.
              </>
            ) : (
              <>
                <strong>{observados}</strong> de {filas.length} prestadores tienen alguna observación.
              </>
            )}
          </p>

          {fichasPendientes && (
            <p className={s.recuentoAviso}>
              <Info size={14} aria-hidden="true" /> Todavía se están leyendo las fichas: los faltantes de
              esas columnas pueden bajar en unos segundos.
            </p>
          )}

          <ListaChequeos chequeos={chequeos} abierto={abierto} onAbrir={setAbierto}>
            {(c) => (
              <>
                <ul className={s.recuentoLista}>
                  {c.filas.slice(0, LIMITE_DETALLE).map((f, i) => (
                    <li key={`${String(f.id ?? "")}-${i}`} className={s.recuentoItem}>
                      <span className={s.recuentoNro}>{pickNroPrestador(f) || "—"}</span>
                      <span className={s.recuentoNombre}>{pickNombre(f) || "Sin nombre"}</span>
                      <BotonVer onClick={() => onVer(f.id)} disabled={!f.id} />
                    </li>
                  ))}
                </ul>
                {c.casos > LIMITE_DETALLE && (
                  <p className={s.recuentoPie}>
                    Se muestran los primeros {LIMITE_DETALLE} de {c.casos}.
                  </p>
                )}
              </>
            )}
          </ListaChequeos>
        </div>

        <footer className={marco.foot}>
          <div className={marco.notes}>
            <span className={marco.note}>
              <Info size={12} aria-hidden="true" />
              Mira sólo las columnas elegidas en «Datos a mostrar». No modifica ningún dato.
            </span>
          </div>
          <BotonPlano type="button" className={marco.done} onClick={onClose}>Listo</BotonPlano>
        </footer>
      </MarcoModal>,
    document.body,
  );
}
