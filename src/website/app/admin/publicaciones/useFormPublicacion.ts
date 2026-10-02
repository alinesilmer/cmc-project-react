import { useEffect, useState, type FormEvent } from "react";
import { createNews, getNewsById, removeNewsDoc, updateNews } from "../../../lib/news.client";
import { normalizar } from "../../../lib/texto";
import type { DocumentoNoticia, Noticia, TipoPublicacion } from "../../../types";

export type CamposPublicacion = {
  titulo: string;
  resumen: string;
  contenido: string;
  publicada: boolean;
  tipo: TipoPublicacion;
  badge: string;
};

/**
 * La etiqueta es texto libre, así que se compara normalizada: "Normas
 * operativas", "NORMAS OPERATIVAS" y "Normas Operativas" son la misma cosa.
 * Esto decide sólo si se muestra el selector — lo que el boletín consulta es la
 * asociación guardada, no este texto.
 */
const esNormaOperativa = (badge: string) => normalizar(badge).startsWith("normas operativas");

/** Estado y guardado del formulario de alta/edición de una publicación. */
export function useFormPublicacion(publicacion: Noticia | null, onGuardada: () => void) {
  const editandoId = publicacion?.id ?? null;

  const [campos, setCampos] = useState<CamposPublicacion>({
    titulo: publicacion?.titulo ?? "",
    resumen: publicacion?.resumen ?? "",
    contenido: publicacion?.contenido ?? "",
    publicada: publicacion?.publicada ?? true,
    tipo: publicacion?.tipo ?? "Noticia",
    badge: publicacion?.badge ?? "",
  });
  const [obrasSociales, setObrasSociales] = useState<number[]>([]);

  const [portada, setPortada] = useState<File | null>(null);
  /** La portada que ya estaba guardada; vacía si se quitó. */
  const [portadaGuardada, setPortadaGuardada] = useState(publicacion?.portada ?? "");
  const [adjuntosNuevos, setAdjuntosNuevos] = useState<File[]>([]);
  const [documentos, setDocumentos] = useState<DocumentoNoticia[]>([]);

  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  // Al editar, el listado no trae adjuntos ni obras sociales: se piden aparte.
  useEffect(() => {
    if (!editandoId) return;
    let vigente = true;
    getNewsById(editandoId)
      .then((detalle) => {
        if (!vigente) return;
        setDocumentos(detalle.documentos ?? []);
        setCampos((prev) => ({ ...prev, badge: detalle.badge ?? "" }));
        setObrasSociales(detalle.obras_sociales ?? []);
      })
      .catch(() => vigente && setError("No se pudieron cargar los documentos de la publicación."));
    return () => {
      vigente = false;
    };
  }, [editandoId]);

  const cambiar = <K extends keyof CamposPublicacion>(campo: K, valor: CamposPublicacion[K]) =>
    setCampos((prev) => ({ ...prev, [campo]: valor }));

  const elegirPortada = (archivo: File) => setPortada(archivo);

  const quitarPortada = () => {
    setPortada(null);
    setPortadaGuardada("");
  };

  const agregarAdjuntos = (archivos: File[]) => setAdjuntosNuevos((prev) => [...prev, ...archivos]);
  const quitarAdjunto = (indice: number) => setAdjuntosNuevos((prev) => prev.filter((_, i) => i !== indice));

  const borrarDocumento = async (docId: number) => {
    if (!editandoId || !confirm("¿Quitar este documento de la publicación?")) return;
    try {
      await removeNewsDoc(editandoId, docId);
      setDocumentos((prev) => prev.filter((d) => d.id !== docId));
    } catch {
      setError("No se pudo eliminar el documento.");
    }
  };

  const guardar = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setGuardando(true);
    try {
      const datos = {
        ...campos,
        // Se manda siempre, también vacío: si la noticia dejó de ser norma
        // operativa hay que desasociarla, no dejar el link viejo colgado en el
        // boletín.
        obrasSociales: esNormaOperativa(campos.badge) ? obrasSociales : [],
      };
      if (editandoId) {
        const seQuitoPortada = Boolean(publicacion?.portada) && !portadaGuardada && !portada;
        await updateNews(editandoId, datos, { portada, clearPortada: seQuitoPortada, adjuntos: adjuntosNuevos });
      } else {
        await createNews(datos, { portada, adjuntos: adjuntosNuevos });
      }
      onGuardada();
    } catch {
      setError("Error al guardar la publicación. Por favor, intentá de nuevo.");
    } finally {
      setGuardando(false);
    }
  };

  return {
    editando: Boolean(editandoId),
    campos,
    cambiar,
    esNormaOperativa: esNormaOperativa(campos.badge),
    obrasSociales,
    setObrasSociales,
    portada,
    portadaGuardada,
    elegirPortada,
    quitarPortada,
    adjuntosNuevos,
    agregarAdjuntos,
    quitarAdjunto,
    documentos,
    borrarDocumento,
    error,
    setError,
    guardando,
    guardar,
  };
}
