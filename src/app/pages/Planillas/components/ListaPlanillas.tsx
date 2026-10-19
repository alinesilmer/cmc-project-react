import { useMemo, useState, type ReactNode } from "react";
import { FolderOpen } from "lucide-react";

import SearchField from "@/app/components/ui/SearchField/SearchField";
import Tabla from "@/app/components/ui/Tabla/Tabla";
import { formatFechaPlanilla, ordenarPlanillas, type Planilla } from "../planillas.types";
import s from "../Planillas.module.scss";
import BotonVer from "@/app/components/ui/BotonVer/BotonVer";

type Props = {
  planillas: Planilla[];
  cargando: boolean;
  /** Qué decir cuando no hay ninguna (sin búsqueda de por medio). */
  vacio: string;
  onVer: (p: Planilla) => void;
  /** Botones propios de cada vista, a la derecha de «Ver» (editar, borrar). */
  acciones?: (p: Planilla) => ReactNode;
};

/** El buscador y la tabla de planillas: lo mismo para el médico y para el Colegio, que sólo agrega sus acciones. */
export default function ListaPlanillas({ planillas, cargando, vacio, onVer, acciones }: Props) {
  const [busqueda, setBusqueda] = useState("");

  // Se filtra en memoria: son ~15 filas y el buscador tiene que responder mientras se tipea, sin una request por tecla.
  const visibles = useMemo(() => {
    const ordenadas = ordenarPlanillas(planillas);
    const q = busqueda.trim().toLowerCase();
    if (!q) return ordenadas;
    return ordenadas.filter(
      (p) => p.descripcion.toLowerCase().includes(q) || p.archivo.toLowerCase().includes(q),
    );
  }, [planillas, busqueda]);

  return (
    <>
      <SearchField
        value={busqueda}
        onChange={(e) => setBusqueda(e.target.value)}
        onClear={() => setBusqueda("")}
        placeholder="Buscar planilla…"
      />

      {visibles.length === 0 ? (
        <div className={s.empty}>
          <FolderOpen size={34} aria-hidden="true" />
          <p>{cargando ? "Cargando…" : busqueda ? "Nada coincide con la búsqueda." : vacio}</p>
        </div>
      ) : (
        <div className={s.tableWrap}>
          <Tabla>
            <thead>
              <tr>
                <th className={s.colFecha}>Fecha</th>
                <th>Planilla</th>
                <th className={s.colAccion} />
              </tr>
            </thead>
            <tbody>
              {visibles.map((p) => (
                <tr key={p.id}>
                  <td className={s.colFecha}>{formatFechaPlanilla(p.fecha)}</td>
                  <td>
                    <span className={s.descripcion}>{p.descripcion}</span>
                  </td>
                  <td className={s.colAccion}>
                    <div className={s.acciones}>
                      {/* Es un botón y no un enlace: el PDF sale por /api/archivos, que pide token. */}
                      <BotonVer onClick={() => onVer(p)} etiqueta="Ver PDF" />
                      {acciones?.(p)}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </Tabla>
        </div>
      )}
    </>
  );
}
