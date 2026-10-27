import { Link } from "react-router-dom";

import s from "./PendientesAlta.module.scss";
import type { PorOSCtx } from "../useNomencladorPorOS";
import Aviso from "@/app/components/ui/Aviso/Aviso";

const MAX_FICHAS = 30;

type Props = Pick<PorOSCtx, "pendientes" | "abrirCargaPrecio" | "selectedNroOS">;

/** Los códigos dados de alta sin precio: cada ficha abre la carga de su precio. */
export default function PendientesAlta({ pendientes, abrirCargaPrecio, selectedNroOS }: Props) {
  if (pendientes.length === 0) return null;
  const n = pendientes.length;

  return (
    <Aviso>
      <span className={s.texto}>
        <strong>
          {n} código{n === 1 ? "" : "s"} dado{n === 1 ? "" : "s"} de alta sin precio.
        </strong>{" "}
        Facturación ya los puede cargar en $0 si está habilitado; cargales el precio:
      </span>
      <span className={s.fichas}>
        {pendientes.slice(0, MAX_FICHAS).map((p) => (
          <button
            key={p.nomenclador_id}
            type="button"
            className={s.ficha}
            title={p.descripcion_os ?? p.descripcion_colegio ?? ""}
            onClick={() => abrirCargaPrecio(p.nomenclador_id, p.codigo, p.descripcion_colegio)}
          >
            {p.codigo}
          </button>
        ))}
        {n > MAX_FICHAS && (
          <Link to={`/panel/nomenclador/codigos-por-os?os=${selectedNroOS}`} className={s.mas}>
            y {n - MAX_FICHAS} más…
          </Link>
        )}
      </span>
    </Aviso>
  );
}
