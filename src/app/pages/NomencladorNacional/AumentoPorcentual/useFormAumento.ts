import { useCallback, useMemo, useState } from "react";

import type { ActualizarPorcentajePayload, Origen } from "../nomenclador.types";
import {
  LARGO_CODIGO,
  MAX_CODIGOS,
  leerPorcentaje,
  porcentajeValido,
  type Alcance,
} from "./aumento.helpers";

/** Los datos del aumento que se está armando y el pedido que sale de ellos; `payload` es `null` hasta que esté completo. */
export function useFormAumento(obraNro: number) {
  const [incluirFijos, setIncluirFijos] = useState(true);
  const [incluirGalenos, setIncluirGalenos] = useState(false);
  const [galenosSel, setGalenosSel] = useState<string[]>([]);

  const [origen, setOrigen] = useState<Origen>("NE");
  const [vigencia, setVigencia] = useState("");
  const [pct, setPct] = useState("");

  const [alcance, setAlcance] = useState<Alcance>("todos");
  const [codigoTipeado, setCodigoTipeado] = useState("");
  const [codigos, setCodigos] = useState<string[]>([]);
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");

  const pctNum = useMemo(() => leerPorcentaje(pct), [pct]);
  const pctOk = porcentajeValido(pctNum);
  const pctError = pct.trim() !== "" && pctNum !== null && pctNum <= -100 ? "Tiene que ser mayor a -100." : undefined;

  const galenosElegidos = useMemo(() => (incluirGalenos ? galenosSel : []), [incluirGalenos, galenosSel]);
  const algoQueAumentar = incluirFijos || galenosElegidos.length > 0;

  const alcanceCompleto =
    alcance === "todos" ||
    (alcance === "codigos" && codigos.length > 0) ||
    (alcance === "rango" && desde.trim() !== "" && hasta.trim() !== "");

  const payload = useMemo<ActualizarPorcentajePayload | null>(() => {
    if (!vigencia || !pctOk || !algoQueAumentar) return null;
    if (incluirFijos && !alcanceCompleto) return null;
    return {
      obra_social_nro: obraNro,
      origen,
      porcentaje: pctNum,
      vigencia_desde: vigencia,
      incluir_valores_fijos: incluirFijos,
      galeno_codigos: galenosElegidos.length ? galenosElegidos : null,
      filtro_codigos: incluirFijos && alcance === "codigos" ? codigos : null,
      filtro_rango: incluirFijos && alcance === "rango" ? { desde: desde.trim(), hasta: hasta.trim() } : null,
    };
  }, [
    obraNro,
    origen,
    vigencia,
    pctOk,
    pctNum,
    algoQueAumentar,
    incluirFijos,
    alcanceCompleto,
    galenosElegidos,
    alcance,
    codigos,
    desde,
    hasta,
  ]);

  const agregarCodigo = useCallback(() => {
    const codigo = codigoTipeado.trim().slice(0, LARGO_CODIGO);
    setCodigoTipeado("");
    if (!codigo) return;
    setCodigos((prev) => (prev.includes(codigo) || prev.length >= MAX_CODIGOS ? prev : [...prev, codigo]));
  }, [codigoTipeado]);

  const quitarCodigo = useCallback((codigo: string) => setCodigos((prev) => prev.filter((c) => c !== codigo)), []);
  const limpiarCodigos = useCallback(() => setCodigos([]), []);

  return {
    incluirFijos, setIncluirFijos,
    incluirGalenos, setIncluirGalenos,
    galenosSel, setGalenosSel,
    origen, setOrigen,
    vigencia, setVigencia,
    pct, setPct, pctNum, pctError,
    alcance, setAlcance,
    codigoTipeado, setCodigoTipeado,
    codigos, agregarCodigo, quitarCodigo, limpiarCodigos,
    desde, setDesde,
    hasta, setHasta,
    algoQueAumentar,
    payload,
  };
}
