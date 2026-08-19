import { useEffect, useMemo, useState } from "react";
import { FileText, FolderOpen, Search } from "lucide-react";

import { abrirAdjunto } from "../../lib/archivos";
import { useNotify } from "../../hooks/useNotify";
import { getPlanillas } from "./planillas.api";
import {
  formatFechaPlanilla,
  ordenarPlanillas,
  urlPlanilla,
  type Planilla,
} from "./planillas.types";
import s from "./Planillas.module.scss";

/**
 * Planillas de consulta publicadas por el Colegio, en versión sólo lectura.
 * Reemplaza `planilla_consulta_dres.php` del legacy.
 */
export default function PlanillasMedico() {
  // Se desestructura `error`: `useNotify()` devuelve un objeto nuevo en cada
  // render, así que el objeto entero como dependencia relanzaría el efecto en
  // bucle. Las funciones sí son estables.
  const { error: avisarError } = useNotify();
  const [todas, setTodas] = useState<Planilla[]>([]);
  const [cargando, setCargando] = useState(true);
  const [busqueda, setBusqueda] = useState("");

  useEffect(() => {
    let vivo = true;
    // Se traen todas y se filtra en memoria: son ~15 filas y el buscador tiene
    // que responder mientras se tipea, sin una request por tecla.
    getPlanillas()
      .then((r) => vivo && setTodas(r))
      .catch(() => vivo && avisarError("No se pudieron cargar las planillas."))
      .finally(() => vivo && setCargando(false));
    return () => {
      vivo = false;
    };
  }, [avisarError]);

  const planillas = useMemo(() => {
    const ordenadas = ordenarPlanillas(todas);
    const q = busqueda.trim().toLowerCase();
    if (!q) return ordenadas;
    return ordenadas.filter(
      (p) =>
        p.descripcion.toLowerCase().includes(q) || p.archivo.toLowerCase().includes(q)
    );
  }, [todas, busqueda]);

  const ver = (p: Planilla) =>
    abrirAdjunto(urlPlanilla(p)).catch((e) => avisarError(e.message));

  return (
    <div className={s.container}>
      <header className={s.header}>
        <FileText size={32} className={s.headerIcon} />
        <div>
          <h1 className={s.title}>Planillas de consulta</h1>
          <p className={s.subtitle}>
            Descargá las planillas que publica el Colegio para presentar con tu
            facturación.
          </p>
        </div>
      </header>

      <div className={s.searchBox}>
        <Search size={17} />
        <input
          type="search"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar planilla…"
          aria-label="Buscar planilla"
        />
      </div>

      {planillas.length === 0 ? (
        <div className={s.empty}>
          <FolderOpen size={30} />
          <p>
            {cargando
              ? "Cargando planillas…"
              : busqueda
                ? `No encontramos planillas que coincidan con «${busqueda}».`
                : "No hay planillas disponibles en este momento."}
          </p>
        </div>
      ) : (
        <div className={s.tableWrap}>
          <table className={s.table}>
            <thead>
              <tr>
                <th className={s.colFecha}>Fecha</th>
                <th>Planilla</th>
                <th className={s.colAccion}>Archivo</th>
              </tr>
            </thead>
            <tbody>
              {planillas.map((p) => (
                <tr key={p.id}>
                  <td className={s.colFecha}>{formatFechaPlanilla(p.fecha)}</td>
                  <td>
                    <span className={s.descripcion}>{p.descripcion}</span>
                    <span className={s.archivo}>{p.archivo}</span>
                  </td>
                  <td className={s.colAccion}>
                    <button type="button" className={s.verBtn} onClick={() => ver(p)}>
                      <FileText size={13} /> Ver PDF
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
