import { useMemo, useState } from "react";
import { useMutation } from "@tanstack/react-query";

import { actualizarPorcentajeValores } from "../nomenclador.api";
import type { ActualizarPorcentajePayload, AumentoPorcentualResult } from "../nomenclador.types";
import { mensajeDeError } from "@/app/shared/lib/httpErrors";
import { hayCambios } from "./aumento.helpers";

type VistaPrevia = { clave: string; payload: ActualizarPorcentajePayload; res: AumentoPorcentualResult };

/** Vista previa (el servidor calcula sin guardar) y aplicación: se guarda exactamente el pedido que se revisó. */
export function useAplicarAumento(payload: ActualizarPorcentajePayload | null, alAplicar: () => void) {
  const [preview, setPreview] = useState<VistaPrevia | null>(null);
  const [confirmando, setConfirmando] = useState(false);
  const [resultado, setResultado] = useState<AumentoPorcentualResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const clave = useMemo(() => (payload ? JSON.stringify(payload) : ""), [payload]);
  // La vista previa vale sólo si se hizo con estos mismos datos.
  const previewVigente = preview && preview.clave === clave ? preview : null;
  const hayParaAplicar = hayCambios(previewVigente?.res ?? null);

  const previewMutation = useMutation({
    mutationFn: (p: ActualizarPorcentajePayload) => actualizarPorcentajeValores({ ...p, dry_run: true }),
    onMutate: () => {
      setError(null);
      setResultado(null);
      setConfirmando(false);
    },
    onSuccess: (res, p) => setPreview({ clave: JSON.stringify(p), payload: p, res }),
    onError: (e) => setError(mensajeDeError(e, "No se pudo calcular la vista previa.")),
  });

  const aplicarMutation = useMutation({
    mutationFn: (p: ActualizarPorcentajePayload) => actualizarPorcentajeValores({ ...p, dry_run: false }),
    onSuccess: (res) => {
      setResultado(res);
      setConfirmando(false);
      setPreview(null);
      alAplicar();
    },
    onError: (e) => {
      setConfirmando(false);
      setError(mensajeDeError(e, "No se pudo aplicar la actualización."));
    },
  });

  return {
    preview: previewVigente?.res ?? null,
    previewVencida: !!preview && !previewVigente && !resultado,
    hayParaAplicar,
    resultado,
    error,
    confirmando,
    calculando: previewMutation.isPending,
    aplicando: aplicarMutation.isPending,
    calcular: () => payload && previewMutation.mutate(payload),
    pedirConfirmacion: () => {
      setResultado(null);
      setConfirmando(true);
    },
    cancelar: () => setConfirmando(false),
    // Siempre el pedido de la vista previa, nunca uno armado después.
    aplicar: () => previewVigente && aplicarMutation.mutate(previewVigente.payload),
  };
}

/** Lo que devuelve el hook, para los componentes que lo reciben. */
export type Aplicacion = ReturnType<typeof useAplicarAumento>;
