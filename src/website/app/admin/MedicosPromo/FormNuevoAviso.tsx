import { useState, type FormEvent } from "react";
import { Plus } from "lucide-react";

import BuscadorMedico from "./BuscadorMedico";
import SelectorImagen from "./SelectorImagen";
import Button from "@/app/components/ui/Button/Button";
import Paso from "@/app/components/ui/Paso/Paso";
import c from "@/app/components/ui/Paso/Campos.module.scss";
import type { DoctorLite } from "@/website/lib/ads.client";

type Props = {
  onCrear: (medicoId: number, activo: boolean, imagen: File) => Promise<void>;
  onError: (mensaje: string | null) => void;
};

/** Alta de un aviso: médico, estado e imagen. */
export default function FormNuevoAviso({ onCrear, onError }: Props) {
  const [medico, setMedico] = useState<DoctorLite | null>(null);
  const [activo, setActivo] = useState(true);
  const [imagen, setImagen] = useState<File | null>(null);
  const [guardando, setGuardando] = useState(false);
  // Cambiar la clave vuelve a montar el buscador vacío después de guardar.
  const [vuelta, setVuelta] = useState(0);

  const guardar = async (e: FormEvent) => {
    e.preventDefault();
    if (!medico) return onError("Elegí un médico de la lista.");
    if (!imagen) return onError("Falta la imagen del aviso.");
    setGuardando(true);
    try {
      await onCrear(medico.id, activo, imagen);
      setMedico(null);
      setActivo(true);
      setImagen(null);
      setVuelta((v) => v + 1);
    } catch {
      onError("No pudimos crear el aviso. Reintentá en unos minutos.");
    } finally {
      setGuardando(false);
    }
  };

  return (
    <Paso icono={Plus} titulo="Agregar publicidad de médico">
      <form onSubmit={guardar} className={c.formulario}>
        <BuscadorMedico key={vuelta} etiqueta="Médico" elegido={medico} onElegir={setMedico} />

        <label className={c.casilla}>
          <input type="checkbox" checked={activo} onChange={(e) => setActivo(e.target.checked)} />
          <span>
            <strong>Activo</strong>
            <small className={c.ayuda}>Apagado, no se muestra en el sitio.</small>
          </span>
        </label>

        <SelectorImagen etiqueta="Imagen" textoBoton="Subir imagen" archivo={imagen} onArchivo={setImagen} onError={onError} />

        <div className={c.acciones}>
          <Button submit isLoading={guardando}>
            Guardar publicidad
          </Button>
        </div>
      </form>
    </Paso>
  );
}
