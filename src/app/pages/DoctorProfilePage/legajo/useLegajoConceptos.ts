import { useEffect, useState } from "react";
import { useNotify } from "@/app/hooks/useNotify";
import type { AppSearchSelectOption } from "@/app/components/ui/AppSearchSelect/AppSearchSelect";
import {
  createSocioDescuento,
  deleteSocioDescuento,
  fetchDescuentosConceptos,
  getSociosDescuento,
  patchSocioDescuento,
} from "../api";
import type { SocioDescuento } from "../api";
import type { TabKey } from "./legajo.types";
import { mensajeDe } from "./legajo.helpers";

/** Pestaña Conceptos: descuentos asignados al socio y quién los paga. */
export function useLegajoConceptos(medicoId: string, tab: TabKey) {
  const notify = useNotify();

  const [sociosDescuento, setSociosDescuento] = useState<SocioDescuento[]>([]);
  const [sdLoading, setSdLoading] = useState(false);
  const [sdError, setSdError] = useState<string | null>(null);
  const [conceptOptions, setConceptOptions] = useState<AppSearchSelectOption[]>([]);
  const [patchingId, setPatchingId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  // new row state
  const [newRowOpen, setNewRowOpen] = useState(false);
  const [newConceptId, setNewConceptId] = useState<number | null>(null);
  const [newPagadorId, setNewPagadorId] = useState<number | null>(null);
  const [savingNew, setSavingNew] = useState(false);

  useEffect(() => {
    if (tab !== "conceptos") return;
    let alive = true;
    (async () => {
      setSdLoading(true);
      setSdError(null);
      try {
        const [rows, descuentos] = await Promise.all([
          getSociosDescuento(medicoId),
          fetchDescuentosConceptos(),
        ]);
        if (!alive) return;
        setSociosDescuento(rows);
        setConceptOptions(
          descuentos.map((d) => ({
            id: d.id,
            label: d.nro_colegio ? `${d.nro_colegio} - ${d.nombre}` : d.nombre,
          }))
        );
      } catch (e: unknown) {
        if (alive) setSdError(mensajeDe(e) || "Error al cargar conceptos");
      } finally {
        if (alive) setSdLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [tab, medicoId]);

  async function handlePatchSocioDescuento(
    id: number,
    field: "descuento_id" | "pagador_medico_id",
    value: number | null
  ) {
    setPatchingId(id);
    try {
      const updated = await patchSocioDescuento(id, { [field]: value });
      setSociosDescuento((prev) => prev.map((sd) => (sd.id === id ? updated : sd)));
      notify.success("Concepto actualizado");
    } catch (e: unknown) {
      notify.error(mensajeDe(e) || "Error al actualizar");
    } finally {
      setPatchingId(null);
    }
  }

  async function handleDeleteSocioDescuento(id: number) {
    setDeletingId(id);
    try {
      await deleteSocioDescuento(id);
      setSociosDescuento((prev) => prev.filter((sd) => sd.id !== id));
      notify.success("Concepto eliminado");
    } catch (e: unknown) {
      notify.error(mensajeDe(e) || "Error al eliminar");
    } finally {
      setDeletingId(null);
    }
  }

  async function handleSaveNewSocioDescuento() {
    if (!newConceptId) return;
    setSavingNew(true);
    try {
      const created = await createSocioDescuento({
        medico_id: Number(medicoId),
        descuento_id: newConceptId,
        pagador_medico_id: newPagadorId ?? null,
      });
      setSociosDescuento((prev) => [...prev, created]);
      setNewRowOpen(false);
      setNewConceptId(null);
      setNewPagadorId(null);
      notify.success("Concepto agregado");
    } catch (e: unknown) {
      notify.error(mensajeDe(e) || "Error al guardar");
    } finally {
      setSavingNew(false);
    }
  }

  return {
    sociosDescuento,
    sdLoading,
    sdError,
    conceptOptions,
    patchingId,
    deletingId,
    newRowOpen,
    setNewRowOpen,
    newConceptId,
    setNewConceptId,
    newPagadorId,
    setNewPagadorId,
    savingNew,
    handlePatchSocioDescuento,
    handleDeleteSocioDescuento,
    handleSaveNewSocioDescuento,
  };
}

export type LegajoConceptos = ReturnType<typeof useLegajoConceptos>;
