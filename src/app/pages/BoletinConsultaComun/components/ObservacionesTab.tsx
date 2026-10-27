import { useMemo, useState } from "react";
import { ExternalLink, FileText, Pencil, Plus } from "lucide-react";

import IconButton from "@/app/components/ui/IconButton/IconButton";
import SearchField from "@/app/components/ui/SearchField/SearchField";
import Tabla from "@/app/components/ui/Tabla/Tabla";
import { useConfirmacion } from "@/app/hooks/useConfirmacion";
import { useNotify } from "@/app/hooks/useNotify";
import { detalleDeError } from "@/app/shared/lib/httpErrors";
import { formatApiDate } from "../boletinConsultaComun.helpers";
import { urlNorma, type NormasPorOS } from "../useNormasOperativas";
import type { Plantilla, useObservaciones } from "../useObservaciones";
import EditorObservacion from "./EditorObservacion";
import PanelPlantillas from "./PanelPlantillas";
import TextoObservacion from "./TextoObservacion";
import s from "./ObservacionesTab.module.scss";
import comun from "./Comun.module.scss";

type Filtro = "todas" | "con" | "sin";

interface ObraSimple {
  nro: number;
  nombre: string;
}

interface Props {
  obras: ObraSimple[];
  cargando: boolean;
  error: string | null;
  obs: ReturnType<typeof useObservaciones>;
  normasPorOS: NormasPorOS;
}

/** Observaciones de cada obra social: se leen en la tabla y se editan en el mismo lugar. */
export default function ObservacionesTab({ obras, cargando, error, obs, normasPorOS }: Props) {
  const { observaciones, templates, savingNro, saveObservacion, addTemplate, removeTemplate, isSavingTemplate } = obs;
  const notify = useNotify();
  const { pedir, modal } = useConfirmacion();

  const [busqueda, setBusqueda] = useState("");
  const [filtro, setFiltro] = useState<Filtro>("todas");
  const [editando, setEditando] = useState<number | null>(null);

  const conObs = useMemo(() => obras.filter((o) => Boolean(observaciones[o.nro])).length, [obras, observaciones]);

  const visibles = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return obras.filter((o) => {
      const tiene = Boolean(observaciones[o.nro]);
      if (filtro === "con" && !tiene) return false;
      if (filtro === "sin" && tiene) return false;
      return !q || o.nombre.toLowerCase().includes(q) || String(o.nro).includes(q);
    });
  }, [obras, observaciones, busqueda, filtro]);

  const guardar = async (nro: number, texto: string) => {
    try {
      await saveObservacion(nro, texto);
      setEditando(null);
      notify.success(texto.trim() ? "Observación guardada" : "Observación eliminada");
    } catch (e) {
      notify.error("No se pudo guardar", detalleDeError(e, "Probá de nuevo."));
    }
  };

  const agregarPlantilla = async (texto: string) => {
    try {
      await addTemplate(texto);
    } catch (e) {
      notify.error("No se pudo agregar la plantilla", detalleDeError(e, "Probá de nuevo."));
      throw e;
    }
  };

  const quitarPlantilla = (p: Plantilla) =>
    pedir(
      { titulo: "Eliminar plantilla", mensaje: `Se borra «${p.texto}». Las observaciones ya guardadas no cambian.`, confirmar: "Eliminar" },
      () => {
        removeTemplate(p.id).catch((e) => notify.error("No se pudo eliminar", detalleDeError(e, "Probá de nuevo.")));
      }
    );

  const filtros: { id: Filtro; rotulo: string; cuenta: number }[] = [
    { id: "todas", rotulo: "Todas", cuenta: obras.length },
    { id: "con", rotulo: "Con observación", cuenta: conObs },
    { id: "sin", rotulo: "Sin observación", cuenta: obras.length - conObs },
  ];

  return (
    <div className={s.obsLayout}>
      <section className={comun.seccion}>
        <div className={comun.barra}>
          <SearchField
            placeholder="Buscar obra social por nombre o número…"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            onClear={() => setBusqueda("")}
          />
          <div className={s.pildoras} role="group" aria-label="Filtrar por observación">
            {filtros.map((f) => (
              <button
                key={f.id}
                type="button"
                className={`${s.pildora} ${filtro === f.id ? s.pildoraActiva : ""}`}
                aria-pressed={filtro === f.id}
                onClick={() => setFiltro(f.id)}
              >
                {f.rotulo}
                <span className={s.pildoraCuenta}>{f.cuenta}</span>
              </button>
            ))}
          </div>
        </div>

        {cargando && <div className={comun.aviso}>Cargando obras sociales…</div>}
        {error && !cargando && <div className={`${comun.aviso} ${comun.avisoError}`}>{error}</div>}
        {!cargando && !error && visibles.length === 0 && (
          <div className={comun.aviso}>{busqueda ? `Sin resultados para «${busqueda}».` : "No hay obras sociales en este filtro."}</div>
        )}

        {visibles.length > 0 && (
          <div className={comun.tablaWrap}>
            <Tabla className={comun.tabla}>
              <thead>
                <tr>
                  <th className={comun.colNro}>N°</th>
                  <th className={s.colNombre}>Obra social</th>
                  <th>Observación</th>
                  <th className={s.colAccion}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {visibles.map((o) => {
                  if (editando === o.nro) {
                    return (
                      <tr key={o.nro}>
                        <td colSpan={4} className={s.editorCelda}>
                          <EditorObservacion
                            nombre={o.nombre}
                            inicial={observaciones[o.nro] ?? ""}
                            plantillas={templates}
                            guardando={savingNro === o.nro}
                            onGuardar={(texto) => void guardar(o.nro, texto)}
                            onCancelar={() => setEditando(null)}
                          />
                        </td>
                      </tr>
                    );
                  }

                  const texto = observaciones[o.nro];
                  const normas = normasPorOS.get(o.nro) ?? [];
                  return (
                    <tr key={o.nro}>
                      <td className={comun.nro}>{o.nro}</td>
                      <td>{o.nombre}</td>
                      <td>
                        {texto ? (
                          <TextoObservacion texto={texto} />
                        ) : (
                          <button type="button" className={s.agregar} onClick={() => setEditando(o.nro)} disabled={editando !== null}>
                            <Plus size={14} aria-hidden="true" />
                            Agregar observación
                          </button>
                        )}
                        {normas.length > 0 && (
                          <div className={s.normas}>
                            {normas.map((n) => (
                              <a key={n.id} className={s.norma} href={urlNorma(n.id)} target="_blank" rel="noopener noreferrer">
                                <FileText size={13} aria-hidden="true" />
                                <span className={s.normaTitulo}>{n.titulo}</span>
                                <span className={s.normaFecha}>{formatApiDate(n.fecha)}</span>
                                <ExternalLink size={12} aria-hidden="true" />
                              </a>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className={s.acciones}>
                        {texto && (
                          <IconButton
                            size="small"
                            className={s.editar}
                            onClick={() => setEditando(o.nro)}
                            title="Editar observación"
                            aria-label={`Editar la observación de ${o.nombre}`}
                            disabled={editando !== null}
                          >
                            <Pencil size={15} />
                          </IconButton>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </Tabla>
          </div>
        )}
      </section>

      <PanelPlantillas plantillas={templates} ocupado={isSavingTemplate} onAgregar={agregarPlantilla} onQuitar={quitarPlantilla} />
      {modal}
    </div>
  );
}
