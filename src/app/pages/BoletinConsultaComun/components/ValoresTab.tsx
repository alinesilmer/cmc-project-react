import { useMemo, useState } from "react";

import SearchField from "@/app/components/ui/SearchField/SearchField";
import Tabla from "@/app/components/ui/Tabla/Tabla";
import { moneyFormatter } from "../boletinConsultaComun.constants";
import { formatApiDate } from "../boletinConsultaComun.helpers";
import type { ConsultaComunItem } from "../boletinConsultaComun.types";
import s from "../BoletinConsultaComun.module.scss";

interface Props {
  items: ConsultaComunItem[];
  cargando: boolean;
  error: string | null;
}

/** Valor vigente de la consulta por obra social, tal como está cargado en el nomenclador. */
export default function ValoresTab({ items, cargando, error }: Props) {
  const [busqueda, setBusqueda] = useState("");

  const filtrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    if (!q) return items;
    return items.filter((i) => i.nombre.toLowerCase().includes(q) || String(i.nro).includes(q));
  }, [items, busqueda]);

  return (
    <section className={s.seccion}>
      <div className={s.barra}>
        <SearchField
          placeholder="Buscar obra social por nombre o número…"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          onClear={() => setBusqueda("")}
        />
      </div>

      {cargando && <div className={s.aviso}>Cargando valores…</div>}
      {error && !cargando && <div className={`${s.aviso} ${s.avisoError}`}>{error}</div>}
      {!cargando && !error && items.length === 0 && <div className={s.aviso}>No hay valores vigentes cargados.</div>}
      {!cargando && items.length > 0 && filtrados.length === 0 && <div className={s.aviso}>Sin resultados para «{busqueda}».</div>}

      {filtrados.length > 0 && (
        <div className={s.tablaWrap}>
          <Tabla className={s.tabla}>
            <thead>
              <tr>
                <th className={s.colNro}>N°</th>
                <th>Obra social</th>
                <th className={s.colValor}>Valor</th>
                <th className={s.colFecha}>Vigente desde</th>
              </tr>
            </thead>
            <tbody>
              {filtrados.map((i) => (
                <tr key={i.nro}>
                  <td className={s.nro}>{i.nro}</td>
                  <td>{i.nombre}</td>
                  <td className={s.valor}>{moneyFormatter.format(i.valor)}</td>
                  <td className={s.fecha}>{formatApiDate(i.fechaCambio)}</td>
                </tr>
              ))}
            </tbody>
          </Tabla>
        </div>
      )}
    </section>
  );
}
