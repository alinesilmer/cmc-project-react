import { useEffect, useState } from "react";
import { useNotify } from "@/app/hooks/useNotify";
import {
  getMedicoDetail,
  setMedicoEstado,
  updateMedico,
  type EstadoCuenta,
} from "../api";
import type { DoctorProfileX, SeccionDatos } from "./legajo.types";
import { getFechaIngreso, normalizePatch, mensajeDe } from "./legajo.helpers";

/** Carga del legajo, estado de la cuenta y edición de la pestaña Datos. */
export function useLegajoDatos(medicoId: string, readOnly: boolean) {
  const notify = useNotify();

  const [data, setData] = useState<DoctorProfileX | null>(null);
  const [loading, setLoading] = useState(true);
  const [estadoCuenta, setEstadoCuenta] = useState<EstadoCuenta>("pendiente");
  const [toggleBusy, setToggleBusy] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState<Partial<DoctorProfileX>>({});

  // Cada bloque de datos es un desplegable.
  const [seccionesAbiertas, setSeccionesAbiertas] = useState<
    Record<SeccionDatos, boolean>
  >({ personales: !readOnly, profesionales: true, impositivos: !readOnly });
  const seccionAbierta = (s: SeccionDatos) => isEditing || seccionesAbiertas[s];
  const alternarSeccion = (s: SeccionDatos) =>
    setSeccionesAbiertas((p) => ({ ...p, [s]: !p[s] }));

  function setField<K extends keyof DoctorProfileX>(
    key: K,
    val: DoctorProfileX[K]
  ) {
    setDraft((d) => ({ ...d, [key]: val }));
  }

  useEffect(() => {
    let alive = true;
    // Al cambiar de médico no queda una edición a medias del anterior.
    setIsEditing(false);
    setDraft({});
    (async () => {
      setLoading(true);
      try {
        const raw = await getMedicoDetail(medicoId);
        if (!alive) return;
        const normalized: DoctorProfileX = {
          ...raw,
          fecha_ingreso: getFechaIngreso(raw),
        };
        setData(normalized);
        if (normalized?.estado_cuenta) setEstadoCuenta(normalized.estado_cuenta);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [medicoId]);

  async function cambiarEstado(checked: boolean) {
    try {
      setToggleBusy(true);
      const next: EstadoCuenta = checked ? "activo" : "baja";
      await setMedicoEstado(medicoId, next);
      setEstadoCuenta(next);
      setData((d) => (d ? { ...d, estado_cuenta: next } : d));
    } catch (e: unknown) {
      notify.error(mensajeDe(e) || "No se pudo actualizar el estado.");
    } finally {
      setToggleBusy(false);
    }
  }

  function alternarEdicion() {
    if (!isEditing) {
      setDraft({
        ...data,
        fecha_ingreso: getFechaIngreso(data),
      });
      setIsEditing(true);
    } else {
      setIsEditing(false);
      setDraft({});
    }
  }

  function cancelarEdicion() {
    setIsEditing(false);
    setDraft({});
  }

  async function guardar() {
    if (!data) return;
    try {
      setSaving(true);
      const payload: Record<string, unknown> = {};
      Object.entries(draft).forEach(([k, v]) => {
        if (v !== undefined) payload[k] = v;
      });
      await updateMedico(data.id, normalizePatch(payload));
      const rawFresh = await getMedicoDetail(String(data.id));
      const fresh: DoctorProfileX = {
        ...rawFresh,
        fecha_ingreso: getFechaIngreso(rawFresh),
      };
      setData(fresh);
      setIsEditing(false);
      setDraft({});
    } catch (e: unknown) {
      notify.error(mensajeDe(e) || "No se pudo guardar los cambios.");
    } finally {
      setSaving(false);
    }
  }

  return {
    data,
    loading,
    estadoCuenta,
    toggleBusy,
    cambiarEstado,
    isEditing,
    saving,
    draft,
    setField,
    alternarEdicion,
    cancelarEdicion,
    guardar,
    seccionAbierta,
    alternarSeccion,
  };
}

export type LegajoDatos = ReturnType<typeof useLegajoDatos>;
