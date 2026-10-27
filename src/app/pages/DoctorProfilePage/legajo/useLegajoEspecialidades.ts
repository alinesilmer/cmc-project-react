import { useEffect, useState } from "react";
import { getListEspecialidades, getMedicoEspecialidades } from "../api";
import type { DoctorEspecialidad, Especialidad, Option } from "../api";
import type { TabKey } from "./legajo.types";

/** Pestaña Especialidades: las adheridas, el catálogo y el estado de sus modales. */
export function useLegajoEspecialidades(medicoId: string, tab: TabKey) {
  const [especs, setEspecs] = useState<DoctorEspecialidad[]>([]);
  const [espLoading, setEspLoading] = useState(false);

  const [assocEspOpen, setAssocEspOpen] = useState(false);
  const [assocEspId, setAssocEspId] = useState<string>("");
  const [assocEspResol, setAssocEspResol] = useState("");
  const [assocEspDate, setAssocEspDate] = useState<Date | null>(null);
  const [assocEspFile, setAssocEspFile] = useState<File | null>(null);

  const [delEspOpen, setDelEspOpen] = useState(false);
  const [espToDelete, setEspToDelete] = useState<DoctorEspecialidad | null>(
    null
  );

  const [espOptions, setEspOptions] = useState<Option[]>([]);

  useEffect(() => {
    if (tab !== "especialidades") return;
    let alive = true;
    (async () => {
      setEspLoading(true);
      try {
        const r = await getMedicoEspecialidades(medicoId);
        if (!alive) return;
        setEspecs(r);
      } finally {
        if (alive) setEspLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [tab, medicoId]);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const list = await getListEspecialidades();
        if (!alive) return;
        const opts = (list || []).map((e: Especialidad) => ({
          id: String(e.id_colegio_espe ?? e.id),
          label: e.nombre || `ID ${e.id}`,
        }));
        setEspOptions(opts);
      } catch (err) {
        setEspOptions([]);
        console.error("No se pudo cargar especialidades:", err);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  return {
    especs,
    setEspecs,
    espLoading,
    assocEspOpen,
    setAssocEspOpen,
    assocEspId,
    setAssocEspId,
    assocEspResol,
    setAssocEspResol,
    assocEspDate,
    setAssocEspDate,
    assocEspFile,
    setAssocEspFile,
    delEspOpen,
    setDelEspOpen,
    espToDelete,
    setEspToDelete,
    espOptions,
  };
}

export type LegajoEspecialidades = ReturnType<typeof useLegajoEspecialidades>;
