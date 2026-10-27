import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { altaNECero, listNomenclador } from "../nomenclador.api";
import type { AltaNECeroResult, NomencladorOut } from "../nomenclador.types";
import { mensajeDeError } from "@/app/shared/lib/httpErrors";

/** Vigencia por defecto de las altas: 01/01/2026 (editable). */
const VIGENCIA_DEFAULT = "2026-01-01";
const ESPERA_BUSQUEDA_MS = 300;
const MIN_LETRAS = 2;

type Pedido = { codigo: string; obra_social_nros: number[]; vigencia_desde: string };
type Vista = { clave: string; pedido: Pedido; res: AltaNECeroResult };

/** El código, las obras sociales y la vigencia elegidos, la vista previa y el alta; se guarda siempre lo que se revisó. */
export function useAgregarCodigo() {
  const [codigoOpts, setCodigoOpts] = useState<NomencladorOut[]>([]);
  const [buscando, setBuscando] = useState(false);
  const [codigo, setCodigo] = useState<NomencladorOut | null>(null);
  const [elegidas, setElegidas] = useState<Set<number>>(new Set());
  const [vigencia, setVigencia] = useState(VIGENCIA_DEFAULT);

  const [vista, setVista] = useState<Vista | null>(null);
  const [resultado, setResultado] = useState<AltaNECeroResult | null>(null);
  const [cargando, setCargando] = useState<"preview" | "aplicar" | null>(null);
  const [error, setError] = useState<{ clave: string; mensaje: string } | null>(null);
  const [confirmando, setConfirmando] = useState(false);

  // Una búsqueda a la vez: la que llega tarde y ya no corresponde se descarta.
  const espera = useRef<ReturnType<typeof setTimeout> | null>(null);
  const secuencia = useRef(0);
  useEffect(() => () => {
    if (espera.current) clearTimeout(espera.current);
  }, []);

  const buscarCodigo = useCallback((q: string) => {
    if (espera.current) clearTimeout(espera.current);
    const turno = ++secuencia.current;
    if (q.trim().length < MIN_LETRAS) {
      setCodigoOpts([]);
      setBuscando(false);
      return;
    }
    setBuscando(true);
    espera.current = setTimeout(async () => {
      let lista: NomencladorOut[] = [];
      try {
        lista = await listNomenclador({ q: q.trim(), activo: true, size: 20 });
      } catch {
        lista = [];
      }
      if (turno !== secuencia.current) return;
      setCodigoOpts(lista);
      setBuscando(false);
    }, ESPERA_BUSQUEDA_MS);
  }, []);

  const elegirCodigo = useCallback((id: string | number | null) => {
    setCodigo(codigoOpts.find((n) => n.id === id) ?? null);
  }, [codigoOpts]);

  const alternar = useCallback((nro: number) => {
    setElegidas((prev) => {
      const sig = new Set(prev);
      if (sig.has(nro)) sig.delete(nro);
      else sig.add(nro);
      return sig;
    });
  }, []);
  const sumar = useCallback((nros: number[]) => setElegidas((prev) => new Set([...prev, ...nros])), []);
  const quitar = useCallback((nros: number[]) => {
    const fuera = new Set(nros);
    setElegidas((prev) => new Set([...prev].filter((n) => !fuera.has(n))));
  }, []);

  const pedido = useMemo<Pedido | null>(
    () =>
      codigo && elegidas.size > 0 && vigencia
        ? { codigo: codigo.codigo, obra_social_nros: [...elegidas].sort((a, b) => a - b), vigencia_desde: vigencia }
        : null,
    [codigo, elegidas, vigencia],
  );
  const clave = pedido ? JSON.stringify(pedido) : "";
  // La vista previa y el error valen sólo para los datos con los que se pidieron.
  const preview = vista && vista.clave === clave ? vista : null;
  const mensajeError = error && error.clave === clave ? error.mensaje : null;

  async function revisar() {
    if (!pedido || cargando !== null) return;
    setCargando("preview");
    setError(null);
    setResultado(null);
    try {
      const res = await altaNECero({ ...pedido, dry_run: true });
      setVista({ clave, pedido, res });
    } catch (e) {
      setError({ clave, mensaje: mensajeDeError(e, "No se pudo calcular la vista previa.") });
    } finally {
      setCargando(null);
    }
  }

  async function aplicar() {
    if (!preview || cargando !== null) return;
    setConfirmando(false);
    setCargando("aplicar");
    setError(null);
    try {
      setResultado(await altaNECero({ ...preview.pedido, dry_run: false }));
      setVista(null);
    } catch (e) {
      setError({ clave, mensaje: mensajeDeError(e, "No se pudo agregar el código.") });
    } finally {
      setCargando(null);
    }
  }

  return {
    codigoOpts, buscando, codigo, buscarCodigo, elegirCodigo,
    elegidas, alternar, sumar, quitar,
    vigencia, setVigencia,
    listo: pedido !== null,
    preview: preview?.res ?? null,
    resultado,
    informe: resultado ?? preview?.res ?? null,
    cargando,
    error: mensajeError,
    confirmando,
    revisar,
    pedirConfirmacion: () => setConfirmando(true),
    cancelar: () => setConfirmando(false),
    aplicar,
  };
}

/** Lo que devuelve el hook, para los componentes que lo reciben. */
export type AltaCodigo = ReturnType<typeof useAgregarCodigo>;
