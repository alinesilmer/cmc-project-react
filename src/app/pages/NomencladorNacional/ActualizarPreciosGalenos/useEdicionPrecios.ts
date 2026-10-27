import { useCallback, useMemo, useState } from "react";

import { actualizarPreciosGalenosLote } from "../nomenclador.api";
import type { GalenoOut } from "../nomenclador.types";
import { avisoVigenciaGaleno } from "../nomenclador.helpers";
import { montoValido, type Grupo, type ResultadoGuardado } from "./precios.helpers";
import { useNotify } from "@/app/hooks/useNotify";
import { hoyISO } from "@/app/shared/lib/fechas";
import { comoErrorApi } from "@/app/shared/lib/httpErrors";

/** Los valores nuevos tipeados, la vigencia y el guardado en lote: todos los galenos se aplican o ninguno. */
export function useEdicionPrecios(
  obraNro: number,
  grupos: Grupo[],
  galenos: GalenoOut[],
  alGuardar: () => Promise<void>,
) {
  const notify = useNotify();
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [abiertos, setAbiertos] = useState<Record<string, boolean>>({});
  const [vigencia, setVigencia] = useState(hoyISO());
  const [guardando, setGuardando] = useState(false);
  const [resultados, setResultados] = useState<ResultadoGuardado[]>([]);
  const [confirmando, setConfirmando] = useState(false);

  const editar = useCallback((codigo: string, valor: string) => setEdits((prev) => ({ ...prev, [codigo]: valor })), []);
  const alternarAbierto = useCallback((codigo: string) => setAbiertos((prev) => ({ ...prev, [codigo]: !prev[codigo] })), []);

  // Sólo cuentan los valores válidos de galenos que existen en la lista.
  const pendientes = useMemo(() => {
    const codigos = new Set(grupos.map((g) => g.codigo));
    return Object.entries(edits).flatMap(([codigo, texto]) => {
      const monto = montoValido(texto);
      return monto !== null && codigos.has(codigo) ? [{ codigo, monto }] : [];
    });
  }, [edits, grupos]);

  // La vigencia más nueva entre los galenos que se van a cambiar (o todos, si todavía no hay cambios): si la elegida no es posterior, se avisa qué pasa.
  const avisoFecha = useMemo(() => {
    const editados = new Set(pendientes.map((p) => p.codigo));
    const masNueva = galenos
      .filter((g) => editados.size === 0 || editados.has(g.codigo))
      .reduce<string | undefined>((m, g) => (m === undefined || g.vigencia_desde > m ? g.vigencia_desde : m), undefined);
    return avisoVigenciaGaleno(vigencia, masNueva);
  }, [galenos, pendientes, vigencia]);

  const resultadoPorCodigo = useMemo(() => new Map(resultados.map((r) => [r.codigo, r])), [resultados]);

  async function guardar() {
    setConfirmando(false);
    if (guardando || pendientes.length === 0 || !vigencia) return;
    setGuardando(true);
    setResultados([]);

    // Un solo pedido y una sola transacción en el servidor: con uno por galeno, los lentos cortaban a los 15 s y los siguientes chocaban con ellos.
    const items = pendientes.map((p) => ({ codigo: p.codigo, nuevo_valor_unitario: p.monto }));
    try {
      await actualizarPreciosGalenosLote({ obra_social_nro: obraNro, vigencia_desde: vigencia, items });
      setResultados(
        items.map(({ codigo }) => {
          const grupo = grupos.find((g) => g.codigo === codigo) as Grupo;
          return {
            codigo,
            nombre: grupo.nombre,
            ok: true,
            msg: grupo.nivelado ? `${grupo.niveles.length} nivel(es) actualizados` : undefined,
          };
        }),
      );
      setEdits({});
      notify.success(`${items.length} galeno(s) actualizados con éxito.`);
    } catch (e) {
      const data = comoErrorApi(e).response?.data;
      const errores = Array.isArray(data?.errores) ? (data.errores as { codigo: string; nombre: string; motivo: string }[]) : [];
      if (errores.length > 0) {
        // Se rechazó el lote entero: se marcan los galenos que lo impidieron.
        setResultados(errores.map((x) => ({ codigo: x.codigo, nombre: x.nombre, ok: false, msg: x.motivo })));
        notify.error("No se aplicó ningún cambio. Revisá los galenos marcados.");
      } else if (data) {
        notify.error(typeof data.detail === "string" ? data.detail : "No se aplicó ningún cambio.");
      } else {
        // Sin respuesta (corte de red o timeout): el servidor puede haber terminado igual.
        notify.error("No se recibió respuesta del servidor. Verificá los valores actuales antes de reintentar.");
      }
    } finally {
      setGuardando(false);
    }

    await alGuardar();
  }

  return {
    edits,
    editar,
    abiertos,
    alternarAbierto,
    vigencia,
    setVigencia,
    pendientes: pendientes.length,
    avisoFecha,
    resultados,
    resultadoPorCodigo,
    guardando,
    confirmando,
    descartar: () => {
      setEdits({});
      setResultados([]);
    },
    pedirConfirmacion: () => pendientes.length > 0 && vigencia !== "" && setConfirmando(true),
    cancelar: () => setConfirmando(false),
    guardar,
  };
}

/** Lo que devuelve el hook, para los componentes que lo reciben. */
export type EdicionPrecios = ReturnType<typeof useEdicionPrecios>;
