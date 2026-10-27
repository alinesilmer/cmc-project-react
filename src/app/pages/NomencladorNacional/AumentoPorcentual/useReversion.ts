import { useState } from "react";
import { useMutation } from "@tanstack/react-query";

import { revertirActualizacionValores } from "../nomenclador.api";
import type { AumentoPorcentualResult } from "../nomenclador.types";
import { mensajeDeError } from "@/app/shared/lib/httpErrors";
import { hayCambios } from "./aumento.helpers";

/** Deshacer el aumento de una fecha: primero se ve qué se revierte, después se confirma. */
export function useReversion(obraNro: number, alRevertir: () => void) {
  const [vigencia, setVigencia] = useState("");
  const [preview, setPreview] = useState<AumentoPorcentualResult | null>(null);
  const [confirmando, setConfirmando] = useState(false);
  const [resultado, setResultado] = useState<AumentoPorcentualResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const pedido = (dry_run: boolean) => ({ obra_social_nro: obraNro, vigencia_revertir: vigencia, dry_run });

  const previewMutation = useMutation({
    mutationFn: () => revertirActualizacionValores(pedido(true)),
    onMutate: () => {
      setError(null);
      setResultado(null);
      setConfirmando(false);
    },
    onSuccess: setPreview,
    onError: (e) => setError(mensajeDeError(e, "No se pudo calcular qué se revierte.")),
  });

  const revertirMutation = useMutation({
    mutationFn: () => revertirActualizacionValores(pedido(false)),
    onSuccess: (res) => {
      setResultado(res);
      setPreview(null);
      setConfirmando(false);
      alRevertir();
    },
    onError: (e) => {
      setConfirmando(false);
      setError(mensajeDeError(e, "No se pudo revertir."));
    },
  });

  // Cambiar la fecha invalida todo lo calculado para la anterior.
  const cambiarVigencia = (valor: string) => {
    setVigencia(valor);
    setPreview(null);
    setResultado(null);
    setConfirmando(false);
    setError(null);
  };

  return {
    vigencia,
    cambiarVigencia,
    preview,
    hayParaRevertir: hayCambios(preview),
    resultado,
    error,
    confirmando,
    calculando: previewMutation.isPending,
    revirtiendo: revertirMutation.isPending,
    calcular: () => previewMutation.mutate(),
    pedirConfirmacion: () => {
      setResultado(null);
      setConfirmando(true);
    },
    cancelar: () => setConfirmando(false),
    revertir: () => revertirMutation.mutate(),
  };
}

/** Lo que devuelve el hook, para los componentes que lo reciben. */
export type Reversion = ReturnType<typeof useReversion>;
