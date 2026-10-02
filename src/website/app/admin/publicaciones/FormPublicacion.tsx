import { motion } from "framer-motion";
import Button from "../../../components/UI/Button/Button";
import Alerta from "../../../components/UI/Alerta/Alerta";
import EditorMarkdown from "./EditorMarkdown";
import ArchivosPublicacion from "./ArchivosPublicacion";
import ObrasSocialesPicker from "./ObrasSocialesPicker";
import { useFormPublicacion } from "./useFormPublicacion";
import type { Noticia, TipoPublicacion } from "../../../types";
import styles from "./formPublicacion.module.scss";

type Props = {
  /** `null` = alta de una publicación nueva. */
  publicacion: Noticia | null;
  onGuardada: () => void;
  onCancelar: () => void;
};

export default function FormPublicacion({ publicacion, onGuardada, onCancelar }: Props) {
  const f = useFormPublicacion(publicacion, onGuardada);
  const textoGuardar = f.guardando
    ? f.editando ? "Guardando…" : "Publicando…"
    : f.editando ? "Guardar cambios" : "Publicar";

  return (
    <motion.div
      className={styles.form}
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.22 }}
    >
      <form onSubmit={f.guardar}>
        {f.error && <Alerta onCerrar={() => f.setError(null)}>{f.error}</Alerta>}

        <div className={styles.inputGroup}>
          <label htmlFor="pub-titulo">Título</label>
          <input
            id="pub-titulo"
            type="text"
            value={f.campos.titulo}
            onChange={(e) => f.cambiar("titulo", e.target.value)}
            placeholder="Título de la publicación"
            required
          />
        </div>

        <div className={styles.inputGroup}>
          <label htmlFor="pub-resumen">Resumen</label>
          <textarea
            id="pub-resumen"
            value={f.campos.resumen}
            onChange={(e) => f.cambiar("resumen", e.target.value)}
            rows={3}
            placeholder="Breve descripción que aparece en las tarjetas y vista previa"
            required
          />
        </div>

        <div className={styles.inputGroup}>
          <div className={styles.inlineBetween}>
            <div className={styles.inputGroup}>
              <label htmlFor="pub-tipo">Tipo</label>
              <select
                id="pub-tipo"
                value={f.campos.tipo}
                onChange={(e) => f.cambiar("tipo", e.target.value as TipoPublicacion)}
                className={styles.select}
              >
                <option value="Noticia">Noticia</option>
                <option value="Curso">Curso</option>
              </select>
            </div>
            <label className={styles.switchLabel}>
              <input
                type="checkbox"
                checked={f.campos.publicada}
                onChange={(e) => f.cambiar("publicada", e.target.checked)}
              />
              <span>Publicada</span>
            </label>
          </div>
        </div>

        <div className={styles.inputGroup}>
          <label htmlFor="pub-badge">Etiqueta (opcional)</label>
          <input
            id="pub-badge"
            type="text"
            list="pub-badge-sugerencias"
            value={f.campos.badge}
            onChange={(e) => f.cambiar("badge", e.target.value)}
            placeholder="Ej: Normas Operativas"
            maxLength={60}
          />
          <datalist id="pub-badge-sugerencias">
            <option value="Normas Operativas" />
          </datalist>
        </div>

        {f.esNormaOperativa && (
          <div className={styles.inputGroup}>
            <span className={styles.etiqueta}>Obras sociales alcanzadas</span>
            <p className={styles.helpText}>
              Aparece como norma operativa en la fila de cada obra social del boletín de consulta común.
            </p>
            <ObrasSocialesPicker value={f.obrasSociales} onChange={f.setObrasSociales} />
          </div>
        )}

        <div className={styles.inputGroup}>
          <EditorMarkdown id="pub-contenido" valor={f.campos.contenido} onCambio={(v) => f.cambiar("contenido", v)} />
        </div>

        <ArchivosPublicacion
          portada={f.portada}
          portadaGuardada={f.portadaGuardada}
          onElegirPortada={f.elegirPortada}
          onQuitarPortada={f.quitarPortada}
          adjuntosNuevos={f.adjuntosNuevos}
          onAgregarAdjuntos={f.agregarAdjuntos}
          onQuitarAdjunto={f.quitarAdjunto}
          documentos={f.documentos}
          onBorrarDocumento={f.borrarDocumento}
          onError={f.setError}
        />

        <div className={styles.formActions}>
          <Button type="submit" variant="primary" size="medium" disabled={f.guardando}>
            {textoGuardar}
          </Button>
          <Button variant="outline" size="medium" onClick={onCancelar} disabled={f.guardando}>
            Cancelar
          </Button>
        </div>
      </form>
    </motion.div>
  );
}
