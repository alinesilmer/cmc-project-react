import { useState } from "react";
import { UserX } from "lucide-react";

import Button from "@/app/components/ui/Button/Button";
import Dialogo, { DialogoAviso, DialogoCampo } from "@/app/components/ui/Dialogo/Dialogo";
import MotivoBaja from "./MotivoBaja";

type Props = {
  nombre: string;
  ocupado: boolean;
  onConfirmar: (motivo: string) => void;
  onClose: () => void;
};

/** Pide el motivo antes de dar de baja la cuenta. */
export default function BajaModal({ nombre, ocupado, onConfirmar, onClose }: Props) {
  const [motivo, setMotivo] = useState("");
  // Sin motivo no hay baja: es lo que queda en el legajo.
  const sinMotivo = motivo.trim() === "";

  return (
    <Dialogo
      titulo="Dar de baja"
      icono={UserX}
      peligro
      onClose={ocupado ? undefined : onClose}
      acciones={
        <>
          <Button variant="ghost" onClick={onClose} disabled={ocupado}>
            Cancelar
          </Button>
          <Button variant="danger" onClick={() => onConfirmar(motivo.trim())} disabled={ocupado || sinMotivo} aria-busy={ocupado}>
            {ocupado ? "Dando de baja…" : "Dar de baja"}
          </Button>
        </>
      }
    >
      <p>
        <strong>{nombre}</strong> deja de poder entrar y se cierran sus sesiones.
      </p>
      <DialogoCampo rotulo="Motivo de Baja" htmlFor="motivo-baja">
        <MotivoBaja id="motivo-baja" value={motivo} onChange={setMotivo} autoFocus />
      </DialogoCampo>
      <DialogoAviso>La fecha de baja se guarda sola.</DialogoAviso>
    </Dialogo>
  );
}
