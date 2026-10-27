import { Plus, SquarePen } from "lucide-react";

import EditorMarkdown from "./EditorMarkdown";
import ArchivosPublicacion from "./ArchivosPublicacion";
import ObrasSocialesPicker from "./ObrasSocialesPicker";
import { useFormPublicacion } from "./useFormPublicacion";
import Button from "@/app/components/ui/Button/Button";
import Paso from "@/app/components/ui/Paso/Paso";
import c from "@/app/components/ui/Paso/Campos.module.scss";
import { ErrorAccion } from "@/app/components/ui/ResultadoAccion/ResultadoAccion";
import type { Noticia, TipoPublicacion } from "@/website/types";

type Props = {
  /** `null` = alta de una publicación nueva. */
  publicacion: Noticia | null;
  onGuardada: () => void;
  onCancelar: () => void;
};

/** Alta y edición de una publicación: los datos, el cuerpo en Markdown y los archivos. */
export default function FormPublicacion({ publicacion, onGuardada, onCancelar }: Props) {
  const f = useFormPublicacion(publicacion, onGuardada);
  const textoGuardar = f.guardando ? (f.editando ? "Guardando…" : "Publicando…") : f.editando ? "Guardar cambios" : "Publicar";

  return (
    <Paso icono={f.editando ? SquarePen : Plus} titulo={f.editando ? "Editar publicación" : "Nueva publicación"}>
      <form onSubmit={f.guardar} className={c.formulario}>
        {f.error && <ErrorAccion>{f.error}</ErrorAccion>}

        <div className={`${c.campo} ${c.campoAncho}`}>
          <label className={c.rotulo} htmlFor="pub-titulo">Título</label>
          <input
            id="pub-titulo"
            type="text"
            className={c.entrada}
            value={f.campos.titulo}
            onChange={(e) => f.cambiar("titulo", e.target.value)}
            required
          />
        </div>

        <div className={`${c.campo} ${c.campoAncho}`}>
          <label className={c.rotulo} htmlFor="pub-resumen">Resumen</label>
          <textarea
            id="pub-resumen"
            className={c.entrada}
            value={f.campos.resumen}
            onChange={(e) => f.cambiar("resumen", e.target.value)}
            rows={3}
            placeholder="Lo que se ve en las tarjetas y en la vista previa"
            required
          />
        </div>

        <div className={c.campo}>
          <label className={c.rotulo} htmlFor="pub-tipo">Tipo</label>
          <select
            id="pub-tipo"
            className={c.seleccion}
            value={f.campos.tipo}
            onChange={(e) => f.cambiar("tipo", e.target.value as TipoPublicacion)}
          >
            <option value="Noticia">Noticia</option>
            <option value="Curso">Curso</option>
          </select>
        </div>

        <label className={c.casilla}>
          <input type="checkbox" checked={f.campos.publicada} onChange={(e) => f.cambiar("publicada", e.target.checked)} />
          <span>
            <strong>Publicada</strong>
            <small className={c.ayuda}>Apagada queda como borrador: no se ve en el sitio.</small>
          </span>
        </label>

        <div className={c.campo}>
          <label className={c.rotulo} htmlFor="pub-badge">Etiqueta (opcional)</label>
          <input
            id="pub-badge"
            type="text"
            className={c.entrada}
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
          <div className={`${c.campo} ${c.campoAncho}`}>
            <span className={c.rotulo}>Obras sociales alcanzadas</span>
            <p className={c.ayuda}>Aparece como norma operativa en la fila de cada obra social del boletín de consulta común.</p>
            <ObrasSocialesPicker value={f.obrasSociales} onChange={f.setObrasSociales} />
          </div>
        )}

        <EditorMarkdown id="pub-contenido" valor={f.campos.contenido} onCambio={(v) => f.cambiar("contenido", v)} />

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

        <div className={c.acciones}>
          <Button submit isLoading={f.guardando}>
            {textoGuardar}
          </Button>
          <Button variant="ghost" onClick={onCancelar} disabled={f.guardando}>
            Cancelar
          </Button>
        </div>
      </form>
      {f.modalConfirmacion}
    </Paso>
  );
}
