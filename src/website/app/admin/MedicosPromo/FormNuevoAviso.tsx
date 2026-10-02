import { useState, type FormEvent } from "react";
import Button from "../../../components/UI/Button/Button";
import BuscadorMedico from "./BuscadorMedico";
import SelectorImagen from "./SelectorImagen";
import type { DoctorLite } from "../../../lib/ads.client";
import styles from "./MedicosPromo.module.scss";

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
    <section className={styles.formSection}>
      <h2>Agregar publicidad de médico</h2>
      <form onSubmit={guardar} className={styles.form}>
        <div className={styles.row}>
          <BuscadorMedico key={vuelta} etiqueta="Médico" elegido={medico} onElegir={setMedico} />
        </div>

        <div className={styles.rowInline}>
          <label className={styles.switchLabel}>
            <input type="checkbox" checked={activo} onChange={(e) => setActivo(e.target.checked)} />
            <span>Activo</span>
          </label>
        </div>

        <SelectorImagen etiqueta="Imagen" textoBoton="Subir imagen" archivo={imagen} onArchivo={setImagen} onError={onError} />

        <div className={styles.actions}>
          <Button type="submit" variant="primary" size="medium" disabled={guardando}>
            {guardando ? "Guardando…" : "Guardar publicidad"}
          </Button>
        </div>
      </form>
    </section>
  );
}
