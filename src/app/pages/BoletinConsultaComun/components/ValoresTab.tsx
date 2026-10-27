import { useMemo, useState } from "react";

import SearchField from "@/app/components/ui/SearchField/SearchField";
import Tabla from "@/app/components/ui/Tabla/Tabla";
import { moneyFormatter } from "../boletinConsultaComun.constants";
import { formatApiDate } from "../boletinConsultaComun.helpers";
import type { ConsultaComunItem } from "../boletinConsultaComun.types";
import s from "./ValoresTab.module.scss";
import comun from "./Comun.module.scss";

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
    <section className={comun.seccion}>
      <div className={comun.barra}>
        <SearchField
          placeholder="Buscar obra social por nombre o número…"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          onClear={() => setBusqueda("")}
        />
      </div>

      {cargando && <div className={comun.aviso}>Cargando valores…</div>}
      {error && !cargando && <div className={`${comun.aviso} ${comun.avisoError}`}>{error}</div>}
      {!cargando && !error && items.length === 0 && <div className={comun.aviso}>No hay valores vigentes cargados.</div>}
      {!cargando && items.length > 0 && filtrados.length === 0 && <div className={comun.aviso}>Sin resultados para «{busqueda}».</div>}

      {filtrados.length > 0 && (
        <div className={comun.tablaWrap}>
          <Tabla className={comun.tabla}>
            <thead>
              <tr>
                <th className={comun.colNro}>N°</th>
                <th>Obra social</th>
                <th className={s.colValor}>Valor</th>
                <th className={s.colFecha}>Vigente desde</th>
              </tr>
            </thead>
            <tbody>
              {filtrados.map((i) => (
                <tr key={i.nro}>
                  <td className={comun.nro}>{i.nro}</td>
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
