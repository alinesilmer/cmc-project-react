import { useState } from "react";
import { KeyRound } from "lucide-react";

import Button from "@/app/components/ui/Button/Button";
import CopyButton from "@/app/components/ui/CopyButton/CopyButton";
import Dialogo, { DialogoAviso, DialogoDatos } from "@/app/components/ui/Dialogo/Dialogo";
import { ErrorAccion } from "@/app/components/ui/ResultadoAccion/ResultadoAccion";
import { mensajeDeError } from "@/app/shared/lib/httpErrors";
import { renovarPassword, type RenovarPasswordOut } from "../api";
import s from "./RenovarPasswordModal.module.scss";

type Props = {
  medicoId: string | number;
  nombre: string;
  onClose: () => void;
};

const fmtVence = (iso: string) =>
  new Date(iso).toLocaleString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

/** "Renovar contraseña" del legajo: confirma, genera la provisoria y la muestra una sola vez para dictársela al socio. */
export default function RenovarPasswordModal({ medicoId, nombre, onClose }: Props) {
  const [resultado, setResultado] = useState<RenovarPasswordOut | null>(null);
  const [error, setError] = useState("");
  const [ocupado, setOcupado] = useState(false);

  const renovar = async () => {
    setError("");
    setOcupado(true);
    try {
      setResultado(await renovarPassword(medicoId));
    } catch (e) {
      setError(mensajeDeError(e, "No se pudo renovar la contraseña."));
    } finally {
      setOcupado(false);
    }
  };

  if (resultado) {
    // Sin cruz ni clic afuera: cerrarlo sin querer pierde la contraseña, que no se vuelve a mostrar.
    return (
      <Dialogo
        titulo="Contraseña provisoria"
        icono={KeyRound}
        acciones={
          <Button variant="primary" onClick={onClose}>
            Listo
          </Button>
        }
      >
        <p>
          Dictásela a <strong>{nombre}</strong>. Al entrar por la web va a tener que elegir una nueva.
        </p>
        <div className={s.clave}>
          <code aria-label="Contraseña provisoria">{resultado.password_provisoria}</code>
          <CopyButton value={resultado.password_provisoria} label="Contraseña" />
        </div>
        <DialogoDatos
          filas={[{ rotulo: "Vence", valor: `${fmtVence(resultado.vence)} (en ${resultado.horas_vigencia} h)` }]}
        />
        <DialogoAviso>
          Es la única vez que se muestra. Si se pierde o vence, renovala de nuevo. En el app del celular no
          funciona: primero tiene que cambiarla en la web.
        </DialogoAviso>
      </Dialogo>
    );
  }

  return (
    <Dialogo
      titulo="Renovar contraseña"
      icono={KeyRound}
      onClose={ocupado ? undefined : onClose}
      acciones={
        <>
          <Button variant="ghost" onClick={onClose} disabled={ocupado}>
            Cancelar
          </Button>
          <Button variant="primary" onClick={renovar} disabled={ocupado} aria-busy={ocupado}>
            {ocupado ? "Renovando…" : "Renovar contraseña"}
          </Button>
        </>
      }
    >
      <p>
        Se va a generar una contraseña provisoria para <strong>{nombre}</strong>, válida por 48 horas. La
        actual deja de funcionar y se cierran todas sus sesiones abiertas.
      </p>
      <DialogoAviso>
        Antes de seguir, confirmá que quien la pide es el socio: por ejemplo, que escriba desde el celular
        registrado en su legajo.
      </DialogoAviso>
      {error && <ErrorAccion>{error}</ErrorAccion>}
    </Dialogo>
  );
}
