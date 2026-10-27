import { useState } from "react";
import { Save, SquarePen, Trash2 } from "lucide-react";

import BuscadorMedico from "./BuscadorMedico";
import SelectorImagen from "./SelectorImagen";
import s from "./MedicosPromo.module.scss";
import Button from "@/app/components/ui/Button/Button";
import c from "@/app/components/ui/Paso/Campos.module.scss";
import { useConfirmacion } from "@/app/hooks/useConfirmacion";
import type { DoctorLite, PubAd } from "@/website/lib/ads.client";

type Props = {
  aviso: PubAd;
  onActualizar: (aviso: PubAd, cambios: { medico_id?: number; activo?: boolean }, imagen?: File | null) => Promise<void>;
  onBorrar: (aviso: PubAd) => Promise<void>;
  onError: (mensaje: string | null) => void;
};

/** Un aviso del listado: se ve, se activa/desactiva y se edita en el lugar. */
export default function TarjetaAviso({ aviso, onActualizar, onBorrar, onError }: Props) {
  const { pedir, modal } = useConfirmacion();
  const [editando, setEditando] = useState(false);
  const [medico, setMedico] = useState<DoctorLite | null>(null);
  const [activo, setActivo] = useState(aviso.activo);
  const [imagen, setImagen] = useState<File | null>(null);
  const titulo = aviso.medico_nombre || `Médico #${aviso.medico_id}`;

  const editar = () => {
    setMedico(null);
    setActivo(aviso.activo);
    setImagen(null);
    setEditando(true);
  };

  const intentar = async (accion: () => Promise<void>, mensaje: string) => {
    try {
      await accion();
      return true;
    } catch {
      onError(mensaje);
      return false;
    }
  };

  const guardar = async () => {
    const cambios = { activo, ...(medico ? { medico_id: medico.id } : {}) };
    if (await intentar(() => onActualizar(aviso, cambios, imagen), "No pudimos guardar los cambios. Reintentá en unos minutos.")) {
      setEditando(false);
    }
  };

  const alternarActivo = () => intentar(() => onActualizar(aviso, { activo: !aviso.activo }), "No pudimos cambiar el estado del aviso.");

  const borrar = () =>
    pedir(
      { titulo: "Eliminar publicidad", mensaje: "¿Eliminar esta publicidad?" },
      () => void intentar(() => onBorrar(aviso), "No pudimos eliminar el aviso."),
    );

  return (
    <article className={s.tarjeta}>
      <div className={s.miniatura}>
        {aviso.adjunto_path ? <img src={aviso.adjunto_path} alt={titulo} loading="lazy" /> : <span>Sin imagen</span>}
      </div>

      <div className={s.cuerpo}>
        <h3 className={s.titulo}>{titulo}</h3>

        {editando ? (
          <>
            <BuscadorMedico etiqueta="Cambiar médico" elegido={medico} onElegir={setMedico} />

            <label className={c.casilla}>
              <input type="checkbox" checked={activo} onChange={(e) => setActivo(e.target.checked)} />
              <span>
                <strong>Activo</strong>
              </span>
            </label>

            <SelectorImagen etiqueta="Reemplazar imagen" textoBoton="Subir" size="small" archivo={imagen} onArchivo={setImagen} onError={onError} />

            <div className={c.acciones}>
              <Button size="sm" leftIcon={<Save size={14} aria-hidden="true" />} onClick={guardar}>
                Guardar
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setEditando(false)}>
                Cancelar
              </Button>
            </div>
          </>
        ) : (
          <>
            <label className={c.casilla}>
              <input type="checkbox" checked={aviso.activo} onChange={alternarActivo} />
              <span>
                <strong>{aviso.activo ? "Activo" : "Inactivo"}</strong>
              </span>
            </label>

            <div className={c.acciones}>
              <Button variant="ghost" size="sm" leftIcon={<SquarePen size={14} aria-hidden="true" />} onClick={editar}>
                Editar
              </Button>
              <Button variant="danger" size="sm" leftIcon={<Trash2 size={14} aria-hidden="true" />} onClick={borrar}>
                Eliminar
              </Button>
            </div>
          </>
        )}
      </div>
      {modal}
    </article>
  );
}
