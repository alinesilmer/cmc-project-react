import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import Button from "@/app/components/ui/Button/Button";
import { fechaLegible, moneda } from "@/app/pages/Importaciones/formato";
import r from "@/app/pages/Validaciones/components/reporte/reporte.module.scss";

import type { Decision, FilaResultado } from "./importarPrestaciones.api";
import s from "./ImportarPrestaciones.module.scss";

/** Filas por página: una planilla puede traer miles y pintarlas todas cuelga el navegador. */
const POR_PAGINA = 50;

const ETIQUETA: Record<string, string> = {
  grabable: "Entra",
  grabada: "Grabada",
  duplicada: "Ya cargada",
  omitida: "No entra",
  elegir_socio: "Elegir socio",
  descartada: "Descartada",
};

const TIPO_CORTO: Record<string, string> = {
  Consulta: "Consulta",
  Practica: "Práctica",
  "Honorarios individuales": "Hon. individuales",
  Sanatorio: "Sanatorio",
};

const ROL: Record<string, string> = { MEDICO: "Médico", AYUDANTE: "Ayudante", PEDIATRA: "Pediatra" };

interface Props {
  filas: FilaResultado[];
  decisiones: Record<number, Decision>;
  onElegir: (indice: number, nroSocio: number | null) => void;
  onDescartar: (indice: number) => void;
  /** En la vista de lo ya grabado se muestra el número de prestación y no hay decisiones. */
  grabadas?: boolean;
}

export default function TablaPrestaciones({ filas, decisiones, onElegir, onDescartar, grabadas = false }: Props) {
  const [pagina, setPagina] = useState(1);
  const paginas = Math.max(1, Math.ceil(filas.length / POR_PAGINA));

  // Cambiar de filtro puede dejar la página actual fuera de rango.
  useEffect(() => setPagina((p) => Math.min(p, paginas)), [paginas]);

  const visibles = useMemo(() => filas.slice((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA), [filas, pagina]);

  if (filas.length === 0) return <p className={s.sinFilas}>No hay filas que mostrar con este filtro.</p>;

  return (
    <>
      <div className={r.tableWrap}>
        <table className={r.table}>
          <thead>
            <tr>
              <th className={r.num}>Fila</th>
              <th>Estado</th>
              <th>Tipo</th>
              <th>Médico</th>
              <th className={r.num}>Código</th>
              <th>Fecha</th>
              <th>Paciente</th>
              <th className={r.num}>Cant.</th>
              <th className={r.num}>Importe</th>
              <th>{grabadas ? "Prestación" : "Motivo / aviso"}</th>
            </tr>
          </thead>
          <tbody>
            {visibles.map((f) => {
              const entra = f.resultado === "grabable" || f.resultado === "grabada";
              const d = decisiones[f.indice] ?? {};
              return (
                <tr key={f.indice} className={entra ? undefined : s.noEntra}>
                  <td className={r.num}>{f.fila}</td>
                  <td>
                    <span className={`${s.chip} ${s[f.resultado]} ${entra && f.aviso ? s.conAviso : ""}`}>
                      {entra && f.aviso ? `${ETIQUETA[f.resultado]} · aviso` : ETIQUETA[f.resultado] ?? f.resultado}
                    </span>
                  </td>
                  <td>{TIPO_CORTO[f.tipo] ?? (f.tipo || "—")}</td>
                  <td>
                    {f.resultado === "elegir_socio" && !grabadas ? (
                      d.descartada ? (
                        <span className={s.aviso}>Descartada: se quita al volver a previsualizar.</span>
                      ) : (
                        <div className={s.elegir}>
                          <select
                            aria-label={`Socio de la fila ${f.fila}`}
                            value={d.nroSocioElegido ?? ""}
                            onChange={(e) => onElegir(f.indice, e.target.value ? Number(e.target.value) : null)}
                          >
                            <option value="">Elegí el socio…</option>
                            {f.candidatos.map((c) => (
                              <option key={c.nroSocio} value={c.nroSocio}>
                                {c.nroSocio} · {c.nombre}
                              </option>
                            ))}
                          </select>
                          <button type="button" className={s.descartar} onClick={() => onDescartar(f.indice)}>
                            Descartar la fila
                          </button>
                        </div>
                      )
                    ) : (
                      <div className={s.celdaMedico}>
                        <span>{f.medico || "—"}</span>
                        {f.equipo && (
                          <span className={s.equipo}>
                            {f.equipo} · {ROL[f.rol] ?? "Médico"}
                          </span>
                        )}
                        {f.nroSocio !== null && (
                          <span className={s.socio}>
                            Socio {f.nroSocio}
                            {f.matricula ? ` · mat. ${f.matricula}` : ""}
                          </span>
                        )}
                      </div>
                    )}
                  </td>
                  <td className={r.num}>
                    <div className={s.codigo}>
                      <span>{f.codigo || "—"}</span>
                      {f.descripcion && <small title={f.descripcion}>{f.descripcion}</small>}
                    </div>
                  </td>
                  <td>{fechaLegible(f.fecha)}</td>
                  <td>{f.afiliado || "—"}</td>
                  <td className={r.num}>{f.cantidad}</td>
                  <td className={r.num}>{entra ? moneda.format(f.importeTotal) : "—"}</td>
                  <td className={s.motivo}>
                    {grabadas ? (
                      f.idDetalle ?? "—"
                    ) : (
                      <>
                        {f.motivo || (f.aviso ? null : "—")}
                        {f.aviso && <span className={s.aviso}>{f.aviso}</span>}
                        {f.comentarios && <span className={s.comentario}>{f.comentarios}</span>}
                      </>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {paginas > 1 && (
        <nav className={s.paginado} aria-label="Paginado de resultados">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={pagina === 1}
            onClick={() => setPagina((p) => p - 1)}
            leftIcon={<ChevronLeft size={16} />}
          >
            Anterior
          </Button>
          <span className={s.paginaActual} aria-live="polite">
            {(pagina - 1) * POR_PAGINA + 1}–{Math.min(pagina * POR_PAGINA, filas.length)} de {filas.length}
          </span>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={pagina === paginas}
            onClick={() => setPagina((p) => p + 1)}
            rightIcon={<ChevronRight size={16} />}
          >
            Siguiente
          </Button>
        </nav>
      )}
    </>
  );
}
