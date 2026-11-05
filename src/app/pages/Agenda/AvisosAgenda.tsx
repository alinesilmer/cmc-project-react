import { useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { usePermisos } from "@/app/auth/usePermisos";
import { useNotify } from "@/app/hooks/useNotify";
import { listAvisos, marcarAvisosLeidos } from "./agenda.api";
import type { AvisoAgenda } from "./agenda.types";

const AVISOS_KEY = ["agenda", "avisos"] as const;
const CADA_10_MIN = 10 * 60 * 1000;
const SIN_AVISOS: AvisoAgenda[] = [];

/** Muestra una vez los eventos de hoy de la agenda al personal; no pinta nada. */
export default function AvisosAgenda() {
  const { can } = usePermisos();
  const { info } = useNotify();
  const queryClient = useQueryClient();
  const vistos = useRef(new Set<number>());

  const { data = SIN_AVISOS } = useQuery({
    queryKey: AVISOS_KEY,
    queryFn: listAvisos,
    // Solo el personal: los socios no tienen agenda interna.
    enabled: can("medico:leer"),
    refetchInterval: CADA_10_MIN,
  });

  useEffect(() => {
    const nuevos = data.filter((a) => !vistos.current.has(a.id));
    if (nuevos.length === 0) return;
    nuevos.forEach((a) => vistos.current.add(a.id));

    const [primero] = nuevos;
    if (nuevos.length === 1) info(`Hoy: ${primero.titulo}`, primero.descripcion ?? undefined, { duration: 10000 });
    else info("Hoy en la agenda", nuevos.map((a) => a.titulo).join(" · "), { duration: 10000 });

    marcarAvisosLeidos()
      .then(() => queryClient.setQueryData(AVISOS_KEY, SIN_AVISOS))
      .catch(() => queryClient.invalidateQueries({ queryKey: AVISOS_KEY }));
  }, [data, info, queryClient]);

  return null;
}
