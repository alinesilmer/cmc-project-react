import { useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2 } from "lucide-react";
import { getJSON } from "../../lib/http";
import type { GalenoFormState, GalenoLevel } from "./boletinGalenos.types";
import { EMPTY_GALENO_VALUES } from "./boletinGalenos.types";
import GalenoForm from "./components/GalenoForm";
import CodigosAfectados from "./components/CodigosAfectados";
import styles from "./BoletinGalenos.module.scss";

type ObrasSocialRaw = Record<string, unknown>;
type ObraSocialItem = { id: string; nombre: string };

function normalizeOS(data: unknown): ObraSocialItem[] {
  const items: ObrasSocialRaw[] = Array.isArray(data) ? (data as ObrasSocialRaw[])
    : Array.isArray((data as any)?.items)   ? (data as any).items
    : Array.isArray((data as any)?.results) ? (data as any).results
    : [];

  return items.map((item, i): ObraSocialItem | null => {
    const nombre = String(
      item?.NOMBRE ?? item?.nombre ?? item?.OBRA_SOCIAL ?? item?.obra_social ?? item?.name ?? ""
    ).trim();
    if (!nombre) return null;
    const id = String(
      item?.NRO_OBRA_SOCIAL ?? item?.NRO_OBRASOCIAL ?? item?.nro_obra_social ?? item?.id ?? `os-${i}`
    );
    return { id, nombre };
  }).filter((x): x is ObraSocialItem => x !== null);
}

const INITIAL_FORM: GalenoFormState = {
  ...EMPTY_GALENO_VALUES,
  nro_obra_social: "",
  fecha_vigencia:  "",
  nivel:           0,
};

export default function BoletinGalenos() {
  const { data: obrasSociales = [], isLoading: osLoading } = useQuery({
    queryKey:  ["obras-sociales-boletin-galenos"],
    queryFn:   () => getJSON<unknown>("/api/obras_social/").then(normalizeOS),
    staleTime: 10 * 60 * 1000,
  });

  const [form, setForm]             = useState<GalenoFormState>(INITIAL_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [saved, setSaved]           = useState(false);

  const handleChange = useCallback(
    (key: keyof GalenoFormState, value: string | GalenoLevel) => {
      setSaved(false);
      setForm((prev) => ({ ...prev, [key]: value }));
    },
    [],
  );

  const handleSubmit = useCallback(async () => {
    setSubmitting(true);
    try {
      // TODO: POST /api/boletin-galenos { ...form }
      await new Promise((r) => setTimeout(r, 1000));
      setSaved(true);
    } finally {
      setSubmitting(false);
    }
  }, [form]);

  const activeOS = obrasSociales.find((os) => os.id === form.nro_obra_social);

  return (
    <div className={styles.container}>

      <div className={styles.header}>
        <div>
          <p className={styles.eyebrow}>Nomenclador</p>
          <h1 className={styles.title}>Boletín Galenos</h1>
        </div>
        {saved && (
          <div className={styles.savedBanner} role="status">
            <CheckCircle2 size={15} /> Guardado correctamente
          </div>
        )}
      </div>

      <div className={styles.layout}>
        <div className={styles.formPanel}>
          <GalenoForm
            form={form}
            onChange={handleChange}
            onSubmit={handleSubmit}
            submitting={submitting}
            obrasSociales={obrasSociales}
            osLoading={osLoading}
          />
        </div>
        <div className={styles.tablePanel}>
          <CodigosAfectados osNombre={activeOS?.nombre} />
        </div>
      </div>

    </div>
  );
}
