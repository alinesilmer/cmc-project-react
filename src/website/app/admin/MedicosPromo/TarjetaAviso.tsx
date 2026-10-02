import { useState } from "react";
import { motion } from "framer-motion";
import { Trash2, SquarePen, Save } from "lucide-react";
import Button from "../../../components/UI/Button/Button";
import BuscadorMedico from "./BuscadorMedico";
import SelectorImagen from "./SelectorImagen";
import type { DoctorLite, PubAd } from "../../../lib/ads.client";
import styles from "./MedicosPromo.module.scss";

type Props = {
  aviso: PubAd;
  onActualizar: (aviso: PubAd, cambios: { medico_id?: number; activo?: boolean }, imagen?: File | null) => Promise<void>;
  onBorrar: (aviso: PubAd) => Promise<void>;
  onError: (mensaje: string | null) => void;
};

/** Un aviso del listado: se ve, se activa/desactiva y se edita en el lugar. */
export default function TarjetaAviso({ aviso, onActualizar, onBorrar, onError }: Props) {
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

  const alternarActivo = () =>
    intentar(() => onActualizar(aviso, { activo: !aviso.activo }), "No pudimos cambiar el estado del aviso.");

  const borrar = () => {
    if (confirm("¿Eliminar esta publicidad?")) void intentar(() => onBorrar(aviso), "No pudimos eliminar el aviso.");
  };

  return (
    <motion.div className={styles.card} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
      <div className={styles.thumb}>
        {aviso.adjunto_path ? (
          <img src={aviso.adjunto_path} alt={titulo} loading="lazy" />
        ) : (
          <div className={styles.placeholder}>Sin imagen</div>
        )}
      </div>

      <div className={styles.body}>
        <div className={styles.title}>{titulo}</div>

        {editando ? (
          <>
            <div className={styles.row}>
              <BuscadorMedico etiqueta="Cambiar médico" elegido={medico} onElegir={setMedico} />
            </div>

            <div className={styles.rowInline}>
              <label className={styles.switchLabel}>
                <input type="checkbox" checked={activo} onChange={(e) => setActivo(e.target.checked)} />
                <span>Activo</span>
              </label>
            </div>

            <SelectorImagen
              etiqueta="Reemplazar imagen"
              textoBoton="Subir"
              size="small"
              archivo={imagen}
              onArchivo={setImagen}
              onError={onError}
            />

            <div className={styles.cardActions}>
              <Button variant="primary" size="small" iconoIzquierda={<Save />} onClick={guardar}>
                Guardar
              </Button>
              <Button variant="outline" size="small" onClick={() => setEditando(false)}>
                Cancelar
              </Button>
            </div>
          </>
        ) : (
          <>
            <div className={styles.statusRow}>
              <label className={styles.switchLabel}>
                <input type="checkbox" checked={aviso.activo} onChange={alternarActivo} />
                <span>{aviso.activo ? "Activo" : "Inactivo"}</span>
              </label>
            </div>

            <div className={styles.cardActions}>
              <Button variant="outline" size="small" iconoIzquierda={<SquarePen />} onClick={editar}>
                Editar
              </Button>
              <Button variant="outline" size="small" iconoIzquierda={<Trash2 />} onClick={borrar}>
                Eliminar
              </Button>
            </div>
          </>
        )}
      </div>
    </motion.div>
  );
}
