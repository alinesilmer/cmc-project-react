import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, CheckCheck } from "lucide-react";

import { usePermisos } from "@/app/auth/usePermisos";
import BotonPlano from "@/app/components/ui/BotonPlano/BotonPlano";
import { listAvisos, marcarAvisosLeidos } from "@/app/pages/Agenda/agenda.api";
import { LABEL_TIPO, colorDe } from "@/app/pages/Agenda/agenda.types";
import type { AvisoAgenda } from "@/app/pages/Agenda/agenda.types";
import s from "./CampanaAgenda.module.scss";

const AVISOS_KEY = ["agenda", "avisos"] as const;
const CADA_10_MIN = 10 * 60 * 1000;
const SIN_AVISOS: AvisoAgenda[] = [];

/** Campana del personal: los eventos de hoy de la agenda que todavía no leyó. */
export default function CampanaAgenda() {
  const { can } = usePermisos();
  const queryClient = useQueryClient();
  const [abierta, setAbierta] = useState(false);
  const raiz = useRef<HTMLDivElement>(null);

  const { data = SIN_AVISOS } = useQuery({
    queryKey: AVISOS_KEY,
    queryFn: listAvisos,
    // Solo el personal: los socios no tienen agenda interna.
    enabled: can("medico:leer"),
    refetchInterval: CADA_10_MIN,
  });

  useEffect(() => {
    if (!abierta) return;
    const fuera = (e: PointerEvent) => {
      if (!raiz.current?.contains(e.target as Node)) setAbierta(false);
    };
    const esc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setAbierta(false);
    };
    document.addEventListener("pointerdown", fuera);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("pointerdown", fuera);
      document.removeEventListener("keydown", esc);
    };
  }, [abierta]);

  if (!can("medico:leer")) return null;

  const marcarLeidas = () =>
    marcarAvisosLeidos()
      .then(() => queryClient.setQueryData(AVISOS_KEY, SIN_AVISOS))
      .catch(() => queryClient.invalidateQueries({ queryKey: AVISOS_KEY }));

  const cantidad = data.length;
  const etiqueta = cantidad > 0 ? `Agenda de hoy: ${cantidad} sin leer` : "Agenda de hoy";

  return (
    <div className={s.campana} ref={raiz}>
      <BotonPlano
        type="button"
        className={s.boton}
        onClick={() => setAbierta((a) => !a)}
        title={etiqueta}
        aria-label={etiqueta}
        aria-expanded={abierta}
        aria-haspopup="true"
      >
        <Bell size={18} strokeWidth={1.8} aria-hidden="true" />
        {cantidad > 0 && <span className={s.cuenta}>{cantidad > 9 ? "9+" : cantidad}</span>}
      </BotonPlano>

      {abierta && (
        <div className={s.panel} role="region" aria-label="Agenda de hoy">
          <p className={s.titulo}>Hoy en la agenda</p>
          {cantidad === 0 ? (
            <p className={s.vacio}>Nada sin leer.</p>
          ) : (
            <>
              <ul className={s.lista}>
                {data.map((a) => (
                  <li key={a.id} className={s.fila}>
                    <span className={s.punto} style={{ background: colorDe(a) }} aria-hidden="true" />
                    <div className={s.texto}>
                      <span className={s.nombre}>{a.titulo}</span>
                      <span className={s.detalle}>{a.descripcion?.trim() || LABEL_TIPO[a.tipo]}</span>
                    </div>
                  </li>
                ))}
              </ul>
              <BotonPlano type="button" className={s.leidas} onClick={marcarLeidas}>
                <CheckCheck size={16} aria-hidden="true" />
                Marcar como leídas
              </BotonPlano>
            </>
          )}
        </div>
      )}
    </div>
  );
}
