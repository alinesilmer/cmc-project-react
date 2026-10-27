import { useCallback, useEffect, useMemo, useState } from "react";
import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation, useNavigate } from "react-router-dom";

import {
  deleteNomenclador,
  listNomenclador,
  listNomencladorNacional,
  toggleNomencladorActivo,
} from "../nomenclador.api";
import type { NomencladorListParams, NomencladorOut, TipoCodigo } from "../nomenclador.types";
import { useNotify } from "@/app/hooks/useNotify";
import { mensajeDeError } from "@/app/shared/lib/httpErrors";

export const TAMANO_PAGINA = 50;
export type FiltroEstado = "activos" | "inactivos" | "todos";

const ESPERA_BUSQUEDA_MS = 350;
const CLAVE_LISTA = "nomenclador-catalogo";

type AvisoDeRetorno = { type: "success" | "error"; msg: string };

/** El listado paginado del catálogo de códigos con sus filtros, y las acciones de activar y eliminar. */
export function useCodigosCatalogo() {
  const qc = useQueryClient();
  const notify = useNotify();
  const navigate = useNavigate();
  const location = useLocation();

  const [busqueda, setBusqueda] = useState("");
  const [termino, setTermino] = useState("");
  const [tipo, setTipo] = useState<TipoCodigo | "">("");
  const [complejidad, setComplejidad] = useState("");
  const [estado, setEstado] = useState<FiltroEstado>("activos");
  const [pagina, setPagina] = useState(1);

  // La búsqueda espera a que se deje de tipear; cualquier filtro vuelve a la primera página.
  useEffect(() => {
    const t = setTimeout(() => {
      setTermino(busqueda.trim());
      setPagina(1);
    }, busqueda.trim() ? ESPERA_BUSQUEDA_MS : 0);
    return () => clearTimeout(t);
  }, [busqueda]);

  const params = useMemo<NomencladorListParams>(() => {
    const p: NomencladorListParams = { page: pagina, size: TAMANO_PAGINA };
    if (termino) p.q = termino;
    if (complejidad) p.complejidad = complejidad;
    if (estado !== "todos") p.activo = estado === "activos";
    if (tipo) p.tipo = tipo;
    return p;
  }, [pagina, termino, complejidad, estado, tipo]);

  const clave = useMemo(() => [CLAVE_LISTA, params] as const, [params]);
  const lista = useQuery({ queryKey: clave, queryFn: () => listNomenclador(params), placeholderData: keepPreviousData });
  const items = lista.data ?? [];

  // El catálogo NN completo, para mostrar el código vinculado de cada fila.
  const nnQuery = useQuery({
    queryKey: ["nomenclador-nacional-opciones"],
    queryFn: () => listNomencladorNacional({ activo: true, size: 200 }),
    staleTime: 10 * 60 * 1000,
  });
  const nnPorId = useMemo(() => new Map((nnQuery.data ?? []).map((o) => [o.id, o])), [nnQuery.data]);

  // El formulario de alta y edición vuelve acá con su aviso de éxito.
  useEffect(() => {
    const aviso = (location.state as { toast?: AvisoDeRetorno } | null)?.toast;
    if (!aviso) return;
    if (aviso.type === "success") notify.success(aviso.msg);
    else notify.error(aviso.msg);
    navigate(location.pathname, { replace: true, state: null });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtrar = useCallback(<T,>(poner: (v: T) => void) => (v: T) => {
    poner(v);
    setPagina(1);
  }, []);

  const alternar = useCallback(
    async (item: NomencladorOut) => {
      try {
        const actualizado = await toggleNomencladorActivo(item.id, !item.activo);
        qc.setQueryData<NomencladorOut[]>(clave, (prev) => prev?.map((i) => (i.id === item.id ? actualizado : i)));
        void qc.invalidateQueries({ queryKey: ["nomenclador-codigos"] });
        notify.success(`Código ${actualizado.activo ? "activado" : "desactivado"}.`);
      } catch {
        notify.error("No se pudo cambiar el estado.");
      }
    },
    [qc, clave, notify],
  );

  const eliminar = useCallback(
    async (id: number) => {
      try {
        await deleteNomenclador(id);
        qc.setQueryData<NomencladorOut[]>(clave, (prev) => prev?.filter((i) => i.id !== id));
        void qc.invalidateQueries({ queryKey: ["nomenclador-codigos"] });
        notify.success("Código eliminado.");
      } catch (e) {
        notify.error(mensajeDeError(e, "No se pudo eliminar el código."));
      }
    },
    [qc, clave, notify],
  );

  return {
    busqueda,
    setBusqueda,
    tipo,
    setTipo: filtrar(setTipo),
    complejidad,
    setComplejidad: filtrar(setComplejidad),
    estado,
    setEstado: filtrar(setEstado),
    pagina,
    setPagina,
    items,
    hayMas: items.length === TAMANO_PAGINA,
    cargando: lista.isPending,
    actualizando: lista.isFetching,
    fallo: lista.isError,
    nnPorId,
    alternar,
    eliminar,
  };
}
