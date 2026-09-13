import React, { useCallback, useEffect, useRef, useState } from "react";
import AppSearchSelect, { type AppSearchSelectOption } from "../../../components/atoms/AppSearchSelect/AppSearchSelect";
import { fetchMedicos } from "../api";
import type { MedicoOption } from "../types";
import { filtrarYOrdenar } from "./localSearch";

// Payee = a quién se le paga. GET /medicos ya devuelve `es_organizacion` para cada
// socio (médico o clínica), así que un solo fetch alcanza para mezclar ambos casos.
const isNumeric = (s: string) => /^\d+$/.test(s);
const minLenFor = (q: string) => (isNumeric(q) ? 1 : 2);

interface Props {
  value: string | null;
  onChange: (cod: string | null, payee: MedicoOption | null) => void;
  disabled?: boolean;
  /** Precarga la opción mostrada antes de que el usuario busque (usado al editar). */
  presetLabel?: string;
  blurOnSelect?: boolean;
  /** Lista ya traída entera (ver CargaFacturacion.tsx): si viene, se filtra en
   *  memoria y no se pega más a `/medicos` por cada tecleo. Sin esto, busca como
   *  siempre — el resto de las pantallas que usan este campo no se tocan. */
  medicosPrecargados?: MedicoOption[];
}

const PayeeAutocomplete: React.FC<Props> = ({
  value, onChange, disabled, presetLabel, blurOnSelect, medicosPrecargados,
}) => {
  const [options, setOptions] = useState<MedicoOption[]>(() =>
    value && presetLabel ? [{ cod: value, nombre: presetLabel }] : [],
  );
  const [loading, setLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const search = useCallback(async (q: string) => {
    if (q.length < minLenFor(q)) { setOptions([]); return; }
    abortRef.current?.abort();
    abortRef.current = new AbortController();
    setLoading(true);
    try {
      const rows = await fetchMedicos(q);
      setOptions(rows);
    } catch {
      // abort or network error
    } finally {
      setLoading(false);
    }
  }, []);

  // Con la lista precargada entera, "buscar" es filtrar en memoria — mismo
  // criterio (cod/nombre/matrícula) que el buscador remoto, sin ida y vuelta al
  // backend por cada tecleo. A diferencia de obra social/clínica, este campo NO
  // muestra la lista completa al hacer click con el campo vacío (a pedido: acá hay
  // demasiados médicos para que tenga sentido navegar sin tipear) — hay que escribir.
  const buscarLocal = useCallback((q: string) => {
    if (!medicosPrecargados) { setOptions([]); return; }
    if (q.length < minLenFor(q)) { setOptions([]); return; }
    // Orden de prioridad de coincidencia: Matrícula > Nombre > Nº de socio.
    const filtrados = filtrarYOrdenar(medicosPrecargados, q, (m) => [m.matricula, m.nombre, m.cod]);
    setOptions(filtrados);
  }, [medicosPrecargados]);

  useEffect(() => () => { abortRef.current?.abort(); }, []);

  const selectOptions: AppSearchSelectOption[] = options.map((m) => ({
    id: m.cod,
    // Nº socio · nombre · matrícula — salvo para clínicas/organizaciones, que no
    // tienen Nº de socio ni matrícula como médico: se muestra solo el nombre.
    label: m.es_organizacion
      ? m.nombre
      : [m.cod, m.nombre, m.matricula]
          .filter((v) => v != null && v !== "")
          .join(" · "),
    subtitle: m.es_organizacion
      ? "Clínica / organización"
      : m.categoria
        ? `Categoría ${m.categoria}`
        : undefined,
  }));

  return (
    <AppSearchSelect
      options={selectOptions}
      value={value}
      onChange={(id) => {
        const payee = (medicosPrecargados ?? options).find((m) => String(m.cod) === String(id)) ?? null;
        onChange(id ? String(id) : null, payee);
      }}
      onQueryChange={medicosPrecargados ? buscarLocal : search}
      loading={medicosPrecargados ? false : loading}
      disabled={disabled}
      blurOnSelect={blurOnSelect}
    />
  );
};

export default PayeeAutocomplete;
