import { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useQuery } from "@tanstack/react-query";
import { Kanban, MousePointerClick, Plus } from "lucide-react";

import { useAuth } from "@/app/auth/useAuth";
import Franja, { Solapa } from "@/app/components/layout/Franja/Franja";
import Button from "@/app/components/ui/Button/Button";
import SearchField from "@/app/components/ui/SearchField/SearchField";
import Vacio from "@/app/components/ui/Vacio/Vacio";
import { useConfirmacion } from "@/app/hooks/useConfirmacion";
import { listResponsables } from "@/app/pages/Agenda/agenda.api";
import type { Responsable } from "@/app/pages/Agenda/agenda.types";
import { ESTADOS, type Estado, type Tarjeta } from "./tablero.types";
import { useArrastre } from "./useArrastre";
import { useTablero } from "./useTablero";
import s from "./Tablero.module.scss";
import ColumnaTablero from "./components/ColumnaTablero";
import NuevaTarjetaDialogo from "./components/NuevaTarjetaDialogo";
import PanelTarjeta from "./components/PanelTarjeta";
import { VistaTarjeta } from "./components/TarjetaItem";

const SIN_RESPONSABLES: Responsable[] = [];

const normalizar = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/** Tablero del personal del Colegio: tres columnas, tarjetas que se arrastran y el detalle al costado. */
export default function TableroPage() {
  const { user } = useAuth();
  const { tarjetas, llena, crear, editar, quitar, mover, comentar } = useTablero();
  const { pedir, modal } = useConfirmacion();

  const consultaResp = useQuery({
    queryKey: ["agenda", "responsables"],
    queryFn: listResponsables,
    staleTime: 30 * 60 * 1000,
  });
  const responsables = consultaResp.data ?? SIN_RESPONSABLES;

  const [busqueda, setBusqueda] = useState("");
  const [soloMias, setSoloMias] = useState(false);
  const [seleccionId, setSeleccionId] = useState<string | null>(null);
  const [nueva, setNueva] = useState<Estado | null>(null);

  const esMia = (t: Tarjeta) => user != null && t.asignadoId === user.id;
  const mias = tarjetas.filter(esMia).length;

  const visibles = useMemo(() => {
    const q = normalizar(busqueda.trim());
    return tarjetas.filter((t) => {
      if (soloMias && !(user != null && t.asignadoId === user.id)) return false;
      return !q || normalizar(`${t.titulo} ${t.asignadoNombre}`).includes(q);
    });
  }, [tarjetas, busqueda, soloMias, user]);

  const porEstado = (estado: Estado) => visibles.filter((t) => t.estado === estado);

  const { gesto, destino, iniciar, vinoDeArrastre } = useArrastre((id, d) => {
    const columna = porEstado(d.estado).filter((t) => t.id !== id);
    mover(id, d.estado, columna[d.indice]?.id ?? null);
  });

  const seleccionada = tarjetas.find((t) => t.id === seleccionId) ?? null;
  const arrastrada = gesto ? (tarjetas.find((t) => t.id === gesto.id) ?? null) : null;

  const abrir = (id: string) => {
    if (!vinoDeArrastre()) setSeleccionId(id);
  };

  const pedirQuitar = (t: Tarjeta) =>
    pedir({ titulo: "Eliminar tarjeta", mensaje: `Se elimina «${t.titulo}» para todo el personal.` }, () => {
      quitar(t.id);
      setSeleccionId(null);
    });

  return (
    <>
      <Franja suelta titulo="Tablero" icono={Kanban}>
        <Solapa activa={!soloMias} onClick={() => setSoloMias(false)} cuenta={tarjetas.length}>
          Todas
        </Solapa>
        <Solapa activa={soloMias} onClick={() => setSoloMias(true)} cuenta={mias}>
          Mías
        </Solapa>
      </Franja>

      <div className={s.pagina}>
        <div className={s.barra}>
          <SearchField
            placeholder="Buscar tarjeta…"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            onClear={() => setBusqueda("")}
          />
          <Button leftIcon={<Plus size={16} aria-hidden="true" />} onClick={() => setNueva("pendiente")} disabled={llena}>
            Nueva tarjeta
          </Button>
        </div>

        <div className={s.zona}>
          <div className={s.tablero}>
            {ESTADOS.map((e) => (
              <ColumnaTablero
                key={e.valor}
                estado={e.valor}
                rotulo={e.rotulo}
                tarjetas={porEstado(e.valor)}
                seleccionId={seleccionId}
                arrastradaId={gesto?.id ?? null}
                indiceDestino={destino?.estado === e.valor ? destino.indice : null}
                onAbrir={abrir}
                onPuntero={(ev, id) => iniciar(ev, id)}
                onAgregar={setNueva}
                puedeAgregar={!llena}
              />
            ))}
          </div>

          {seleccionada ? (
            <PanelTarjeta
              key={seleccionada.id}
              tarjeta={seleccionada}
              autor={user?.nombre ?? ""}
              responsables={responsables}
              onEditar={(cambios) => editar(seleccionada.id, cambios)}
              onComentar={(texto) => comentar(seleccionada.id, user?.nombre ?? "Sin nombre", texto)}
              onQuitar={() => pedirQuitar(seleccionada)}
            />
          ) : (
            <aside className={s.panel}>
              <Vacio icono={MousePointerClick}>Elegí una tarjeta para ver el detalle</Vacio>
            </aside>
          )}
        </div>
      </div>

      {nueva && (
        <NuevaTarjetaDialogo
          estadoInicial={nueva}
          responsables={responsables}
          onClose={() => setNueva(null)}
          onCrear={(datos) => {
            setSeleccionId(crear(datos));
            setNueva(null);
          }}
        />
      )}

      {gesto &&
        arrastrada &&
        createPortal(
          <div className={s.fantasma} style={{ left: gesto.x, top: gesto.y, width: gesto.ancho }}>
            <VistaTarjeta tarjeta={arrastrada} />
          </div>,
          document.body,
        )}
      {modal}
    </>
  );
}
