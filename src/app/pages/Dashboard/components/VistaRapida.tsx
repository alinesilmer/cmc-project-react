import { useEffect, useState } from "react";

import { useObrasSociales } from "@/app/pages/ObrasSociales/useObrasSociales";
import type { Vista } from "../vistasInicio";
import s from "./VistaRapida.module.scss";
import SearchField from "@/app/components/ui/SearchField/SearchField";
import Tabla from "@/app/components/ui/Tabla/Tabla";
import BotonPlano from "@/app/components/ui/BotonPlano/BotonPlano";

const ESQUELETO = Array.from({ length: 8 }, (_, i) => i);

const CLAVE_OBRA = "cmc:inicio-obra-social";

// La última obra social consultada queda elegida para la próxima vez.
function leerObraGuardada(): number | null {
  try {
    const n = Number(window.localStorage.getItem(CLAVE_OBRA));
    return Number.isInteger(n) && n > 0 ? n : null;
  } catch {
    return null;
  }
}

function guardarObra(nro: number | null): void {
  try {
    if (nro === null) window.localStorage.removeItem(CLAVE_OBRA);
    else window.localStorage.setItem(CLAVE_OBRA, String(nro));
  } catch {
    // Sin almacenamiento la elección dura lo que dura la pestaña.
  }
}

function SelectorObraSocial({ valor, onChange }: { valor: number | null; onChange: (nro: number | null) => void }) {
  const { data } = useObrasSociales();
  const obras = [...(data ?? [])].sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));

  return (
    <select
      className={s.selector}
      value={valor ?? ""}
      onChange={(e) => onChange(e.target.value ? Number(e.target.value) : null)}
      aria-label="Obra social"
    >
      <option value="">Obra social…</option>
      {obras.map((o) => (
        <option key={o.nro_obra_social} value={o.nro_obra_social}>
          {o.nombre}
        </option>
      ))}
    </select>
  );
}

type TablaProps = { vista: Vista; busqueda: string; obraSocial: number | null; tipo: string };

function TablaVista({ vista, busqueda, obraSocial, tipo }: TablaProps) {
  const { filas, cargando, error, aviso } = vista.useFilas(busqueda, obraSocial, tipo);

  if (aviso) return <p className={s.aviso}>{aviso}</p>;
  if (error) return <p className={s.aviso}>No se pudo cargar.</p>;
  if (!cargando && filas.length === 0) {
    return <p className={s.aviso}>{busqueda ? "Sin resultados." : "Sin datos."}</p>;
  }

  const clase = (j: number) => {
    const c = vista.columnas[j];
    return `${c?.angosta ? s.angosta : s.ancha} ${c?.derecha ? s.derecha : ""}`;
  };

  return (
    <div className={s.tablaCaja}>
      <Tabla className={s.tabla}>
        <thead>
          <tr>
            {vista.columnas.map((c, j) => (
              <th key={c.titulo} className={clase(j)}>
                {c.titulo}
              </th>
            ))}
          </tr>
        </thead>
        <tbody aria-busy={cargando}>
          {cargando
            ? ESQUELETO.map((i) => (
                <tr key={i}>
                  {vista.columnas.map((c) => (
                    <td key={c.titulo}>
                      <span className={s.hueso} />
                    </td>
                  ))}
                </tr>
              ))
            : filas.map((fila, i) => (
                <tr key={i}>
                  {fila.map((celda, j) => (
                    <td key={j} className={clase(j)} title={celda}>
                      {celda}
                    </td>
                  ))}
                </tr>
              ))}
        </tbody>
      </Tabla>
    </div>
  );
}

/** Panel lateral del Inicio: las primeras filas de los listados que más se consultan. */
export default function VistaRapida({ vistas }: { vistas: Vista[] }) {
  const [elegidaId, setElegidaId] = useState(vistas[0]?.id ?? "");
  const [texto, setTexto] = useState("");
  const [busqueda, setBusqueda] = useState("");
  const [obraSocial, setObraSocial] = useState<number | null>(leerObraGuardada);
  const [tipo, setTipo] = useState("todos");

  // Se busca cuando se deja de escribir, no en cada tecla.
  useEffect(() => {
    const t = window.setTimeout(() => setBusqueda(texto.trim()), 300);
    return () => window.clearTimeout(t);
  }, [texto]);

  const elegir = (id: string) => {
    setElegidaId(id);
    setTexto("");
    setBusqueda("");
    setTipo("todos");
  };

  const elegirObra = (nro: number | null) => {
    setObraSocial(nro);
    guardarObra(nro);
  };

  const vista = vistas.find((v) => v.id === elegidaId) ?? vistas[0];
  if (!vista) return null;

  return (
    <section className={s.panel}>
      <div className={s.solapas} role="tablist" aria-label="Listados">
        {vistas.map((v) => {
         
          const activa = v.id === vista.id;
          return (
            <BotonPlano
              key={v.id}
              type="button"
              role="tab"
              id={`solapa-${v.id}`}
              aria-selected={activa}
              aria-controls="vista-rapida"
              className={`${s.solapa} ${activa ? s.solapaActiva : ""}`}
              onClick={() => elegir(v.id)}
            >
              {v.titulo}
            </BotonPlano>
          );
        })}
      </div>

      <div id="vista-rapida" role="tabpanel" aria-labelledby={`solapa-${vista.id}`} className={s.cuerpo}>
        <div className={s.cabecera}>
        
          <SearchField
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            placeholder={vista.buscar}
            ariaLabel={`Buscar en ${vista.titulo}`}
          />
          {vista.tipos && (
            <select className={s.filtroTipo} value={tipo} onChange={(e) => setTipo(e.target.value)} aria-label="Tipo">
              {vista.tipos.map((t) => (
                <option key={t.valor} value={t.valor}>
                  {t.rotulo}
                </option>
              ))}
            </select>
          )}
          {vista.eligeObraSocial && <SelectorObraSocial valor={obraSocial} onChange={elegirObra} />}
        </div>
        {/* La `key` monta una tabla por vista: cada una llama a su propio hook. */}
        <TablaVista key={vista.id} vista={vista} busqueda={busqueda} obraSocial={obraSocial} tipo={tipo} />
      </div>

     
    </section>
  );
}
