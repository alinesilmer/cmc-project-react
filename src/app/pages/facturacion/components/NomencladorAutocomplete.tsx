import React, { useEffect, useMemo, useRef, useState } from "react";
import AppSearchSelect, { type AppSearchSelectOption } from "@/app/components/ui/AppSearchSelect/AppSearchSelect";
import { fetchCodigosHabilitados } from "../api";
import type { NomencladorOption } from "../types";
import { CODIGOS_BLOQUEADOS } from "../constants";

// Cacheado por médico y obra social — los códigos habilitados de un socio no son los
// mismos que los de otro, y la descripción depende de la OS.
const cache = new Map<string, { data: NomencladorOption[]; ts: number }>();
const CACHE_TTL = 5 * 60 * 1000;

const normalizar = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/** Filtra por código o por nombre. La búsqueda es local porque el backend sólo sabe
 * filtrar por código, y además el nombre que se muestra es el que pactó la obra
 * social, que no siempre coincide con el del catálogo. Cada palabra tipeada tiene que
 * aparecer en el código o en la descripción; las coincidencias por código van primero
 * para que Enter siga tomando el código que se estaba tipeando. */
const filtrar = (lista: NomencladorOption[], query: string): NomencladorOption[] => {
  const palabras = normalizar(query).split(/[^a-z0-9]+/).filter(Boolean);
  if (!palabras.length) return lista;
  const porCodigo: NomencladorOption[] = [];
  const porNombre: NomencladorOption[] = [];
  for (const n of lista) {
    const codigo = n.codigo.toLowerCase();
    const descripcion = normalizar(n.descripcion ?? "");
    if (!palabras.every((p) => codigo.includes(p) || descripcion.includes(p))) continue;
    if (palabras.some((p) => codigo.includes(p))) porCodigo.push(n);
    else porNombre.push(n);
  }
  return [...porCodigo, ...porNombre];
};

interface Props {
  value: string | null;
  onChange: (codigo: string | null, nom: NomencladorOption | null) => void;
  /** Médico ya elegido en el formulario — los códigos habilitados dependen de él. */
  codMedico: string | null;
  /** Obra social de la prestación — si se sabe, la descripción de cada código es la
   * que esa OS pactó en su propio `nm_valores` en vez de la genérica del catálogo. */
  codObra?: string | null;
  disabled?: boolean;
  /** Precarga la opción mostrada antes de que el usuario busque (usado al editar). */
  presetLabel?: string;
  blurOnSelect?: boolean;
}

const NomencladorAutocomplete: React.FC<Props> = ({ value, onChange, codMedico, codObra, disabled, presetLabel, blurOnSelect }) => {
  const [habilitados, setHabilitados] = useState<NomencladorOption[]>(() =>
    value && presetLabel ? [{ codigo: value, descripcion: presetLabel }] : [],
  );
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const pedidoRef = useRef(0);

  // Al cambiar (o perder) el médico u obra social, los códigos habilitados anteriores
  // ya no valen — se carga la lista completa habilitada para el nuevo (sin `q`).
  useEffect(() => {
    const pedido = ++pedidoRef.current;
    setHabilitados([]);
    if (!codMedico) { setLoading(false); return; }
    const cacheKey = `${codMedico}::${codObra ?? ""}`;
    const cached = cache.get(cacheKey);
    if (cached && Date.now() - cached.ts < CACHE_TTL) {
      setHabilitados(cached.data);
      setLoading(false);
      return;
    }
    setLoading(true);
    fetchCodigosHabilitados(codMedico, undefined, codObra)
      .then((rows) => {
        cache.set(cacheKey, { data: rows, ts: Date.now() });
        if (pedido === pedidoRef.current) setHabilitados(rows);
      })
      .catch(() => {
        // error de red: el campo queda sin opciones
      })
      .finally(() => {
        if (pedido === pedidoRef.current) setLoading(false);
      });
  }, [codMedico, codObra]);

  const selectOptions: AppSearchSelectOption[] = useMemo(
    () =>
      filtrar(habilitados, query)
        .filter((n) => !CODIGOS_BLOQUEADOS.includes(n.codigo))
        .map((n) => ({
          id: n.codigo,
          label: `${n.codigo} · ${n.descripcion}`,
          subtitle: n.categoria ?? undefined,
        })),
    [habilitados, query],
  );

  return (
    <AppSearchSelect
      options={selectOptions}
      value={value}
      onChange={(id) => {
        const nom = habilitados.find((n) => n.codigo === String(id)) ?? null;
        onChange(id ? String(id) : null, nom);
      }}
      onQueryChange={setQuery}
      loading={loading}
      disabled={disabled || !codMedico}
      blurOnSelect={blurOnSelect}
    />
  );
};

export default NomencladorAutocomplete;
