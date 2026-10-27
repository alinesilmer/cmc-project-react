import { useEffect, useState } from "react";

import { completarBaseNN } from "../nomenclador.api";
import type { CompletarBaseNNResult } from "../nomenclador.types";
import { mensajeDeError } from "@/app/shared/lib/httpErrors";

/** Elegir la obra social calcula sola la vista previa; aplicar guarda lo que esa vista mostró. */
export function useCompletarNN() {
  const [os, setOs] = useState<number | null>(null);
  const [preview, setPreview] = useState<CompletarBaseNNResult | null>(null);
  const [resultado, setResultado] = useState<CompletarBaseNNResult | null>(null);
  const [cargando, setCargando] = useState<"preview" | "aplicar" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmando, setConfirmando] = useState(false);

  useEffect(() => {
    setPreview(null);
    setResultado(null);
    setError(null);
    if (os == null) return;
    // Si se elige otra obra social antes de que responda, la respuesta vieja se descarta.
    let vigente = true;
    setCargando("preview");
    completarBaseNN(os, true)
      .then((r) => vigente && setPreview(r))
      .catch((e) => vigente && setError(mensajeDeError(e, "No se pudo calcular la vista previa.")))
      .finally(() => vigente && setCargando(null));
    return () => {
      vigente = false;
    };
  }, [os]);

  async function aplicar() {
    if (os == null || cargando !== null) return;
    setConfirmando(false);
    setCargando("aplicar");
    setError(null);
    try {
      setResultado(await completarBaseNN(os, false));
      setPreview(null);
    } catch (e) {
      setError(mensajeDeError(e, "No se pudo completar el nomenclador."));
    } finally {
      setCargando(null);
    }
  }

  return {
    os,
    elegirOs: setOs,
    preview,
    resultado,
    informe: resultado ?? preview,
    hayAlgoParaCrear: !!preview && (preview.galenos_creados.length > 0 || preview.nn_creados > 0),
    cargando,
    error,
    confirmando,
    pedirConfirmacion: () => setConfirmando(true),
    cancelar: () => setConfirmando(false),
    aplicar,
  };
}
