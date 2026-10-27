import { useLayoutEffect, useState } from "react";
import { type CapaCargaCtx } from "./capaCargaContexto";

type Modos = {
  isReplicando: boolean;
  isComplemento: boolean;
  isEdit: boolean;
  editId: string | undefined;
  capa: CapaCargaCtx | null;
};

/** Estado de los tres modos de la pantalla: replicar, complementaria y edición. */
export function useCargaEstadoModos({ isReplicando, isComplemento, isEdit, editId, capa }: Modos) {
  const [loadingReplicar, setLoadingReplicar] = useState(isReplicando);

  // Complementaria — OS/período fijos, tomados de la factura referenciada por id.
  const [complementoMeta, setComplementoMeta] = useState<{
    cod_obra: string;
    periodo: string;
    periodo_label: string;
    version: number;
  } | null>(null);
  const [loadingComplemento, setLoadingComplemento] = useState(isComplemento);
  const [complementoError, setComplementoError] = useState<string | null>(null);

  // Edición — snapshot de la prestación tal como está guardada.
  const [editMeta, setEditMeta] = useState<{
    cod_obra_social: string;
    /** "<nro> · <nombre>" resuelto aparte; el fetch de la prestación solo trae el código. */
    cod_obra_social_label?: string;
    periodo: string;
    estado: string | null;
  } | null>(null);
  const [loadingEdit, setLoadingEdit] = useState(isEdit);
  // Por qué no se pudo abrir la edición (null = se pudo). Un 404 es "no existe"; el resto
  // se muestra tal cual, para no confundir un error de red o de permisos con eso.
  const [errorEdicion, setErrorEdicion] = useState<string | null>(null);
  // "La primera precarga de edición terminó ENTERA (datos + labels de los
  // autocompletes)". Es lo que gatea el render del formulario: los autocompletes
  // fijan su texto al montar (ver AppSearchSelect) y si se muestran a mitad de la
  // precarga quedan con "(valor actual)" o vacíos para siempre. No se puede usar
  // `editMeta` para esto — se setea al principio de la precarga, no al final.
  const [editHidratado, setEditHidratado] = useState(false);
  // Editar arranca siempre arriba.
  useLayoutEffect(() => {
    if (!isEdit) return;
    if (capa) capa.contenedor.current?.scrollTo({ top: 0, left: 0, behavior: "auto" });
    else window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [isEdit, editId, editHidratado, capa]);

  return {
    loadingReplicar,
    setLoadingReplicar,
    complementoMeta,
    setComplementoMeta,
    loadingComplemento,
    setLoadingComplemento,
    complementoError,
    setComplementoError,
    editMeta,
    setEditMeta,
    loadingEdit,
    setLoadingEdit,
    errorEdicion,
    setErrorEdicion,
    editHidratado,
    setEditHidratado,
  };
}
