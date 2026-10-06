import { useCallback, useState } from "react";

import AppSearchSelect from "@/app/components/ui/AppSearchSelect/AppSearchSelect";
import type { AppSearchSelectOption } from "@/app/components/ui/AppSearchSelect/AppSearchSelect";
import { fetchMedicos } from "@/app/pages/facturacion/api";

import type { FilaResultado } from "../importaciones.api";
import s from "./panel.module.scss";

/** Buscador de socio para una matrícula que no cae en ninguno. */
function BuscarSocio({ valor, onElegir }: { valor: number | null; onElegir: (n: number | null) => void }) {
  const [opciones, setOpciones] = useState<AppSearchSelectOption[]>([]);
  const [cargando, setCargando] = useState(false);
  const buscar = useCallback(async (q: string) => {
    if (q.trim().length < 2) return;
    setCargando(true);
    try {
      const res = await fetchMedicos(q, 20);
      setOpciones(res.map((m) => ({ id: Number(m.cod), label: `${m.cod} · ${m.nombre}`, subtitle: m.matricula ? `Mat. ${m.matricula}` : undefined })));
    } finally {
      setCargando(false);
    }
  }, []);
  return (
    <AppSearchSelect
      options={opciones}
      value={valor}
      loading={cargando}
      onQueryChange={(q) => void buscar(q)}
      onChange={(v) => onElegir(v == null ? null : Number(v))}
    />
  );
}

/**
 * Celda «Médico» de una fila en `elegir_socio`: selector entre los candidatos
 * de la matrícula (o buscador si no tiene ninguno) y la opción de descartar.
 * La elección vale sólo para esta fila.
 */
export default function ElegirSocio({
  fila,
  valor,
  descartada,
  onElegir,
  onDescartar,
}: {
  fila: FilaResultado;
  valor: number | null;
  descartada: boolean;
  onElegir: (nro: number | null) => void;
  onDescartar: () => void;
}) {
  if (descartada) {
    return <span className={s.aviso}>Descartada: se quita al volver a previsualizar.</span>;
  }
  return (
    <div className={s.elegirSocio}>
      {fila.candidatos.length > 0 ? (
        <select value={valor ?? ""} onChange={(e) => onElegir(e.target.value ? Number(e.target.value) : null)}>
          <option value="">Elegí el socio…</option>
          {fila.candidatos.map((c) => (
            <option key={c.nroSocio} value={c.nroSocio}>{c.nroSocio} · {c.nombre}</option>
          ))}
        </select>
      ) : (
        <BuscarSocio valor={valor} onElegir={onElegir} />
      )}
      <button type="button" className={s.descartar} onClick={onDescartar}>
        Descartar esta fila
      </button>
    </div>
  );
}
