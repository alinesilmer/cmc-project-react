import { Plus } from "lucide-react";

import s from "./FiltrosPorOS.module.scss";
import EspecialidadCombo from "../../EspecialidadCombo";
import { TIPOS_CODIGO } from "../../components/tipoCodigo";
import type { TipoCodigo } from "../../nomenclador.types";
import type { PorOSCtx } from "../useNomencladorPorOS";
import Button from "@/app/components/ui/Button/Button";
import c from "@/app/components/ui/Paso/Campos.module.scss";
import SearchField from "@/app/components/ui/SearchField/SearchField";
import Segmentos from "@/app/components/ui/Segmentos/Segmentos";

type Props = Pick<
  PorOSCtx,
  | "codeSearch"
  | "setCodeSearch"
  | "soloPresupuesto"
  | "setSoloPresupuesto"
  | "tipoFilter"
  | "setTipoFilter"
  | "especialidades"
  | "especialidadFilter"
  | "setEspecialidadFilter"
  | "openCreate"
>;

const PRECIOS = [
  { valor: "todos", rotulo: "Todos" },
  { valor: "presupuesto", rotulo: "Por presupuesto" },
] as const;

/** La barra sobre la tabla: búsqueda por código, por presupuesto, tipo, especialidad y «Cargar precio». */
export default function FiltrosPorOS(p: Props) {
  return (
    <div className={s.barra}>
      <SearchField
        value={p.codeSearch}
        onChange={(e) => p.setCodeSearch(e.target.value)}
        onClear={() => p.setCodeSearch("")}
        placeholder="Código o descripción"
        ariaLabel="Buscar código"
      />

      <Segmentos
        ariaLabel="Mostrar"
        opciones={[...PRECIOS]}
        valor={p.soloPresupuesto ? "presupuesto" : "todos"}
        onChange={(v) => p.setSoloPresupuesto(v === "presupuesto")}
      />

      <select
        className={`${c.seleccion} ${s.filtro}`}
        value={p.tipoFilter}
        onChange={(e) => p.setTipoFilter(e.target.value as TipoCodigo | "todos")}
        aria-label="Tipo"
      >
        <option value="todos">Todos los tipos</option>
        {TIPOS_CODIGO.map((t) => (
          <option key={t.value} value={t.value}>
            {t.label}
          </option>
        ))}
      </select>

      <EspecialidadCombo
        especialidades={p.especialidades}
        value={p.especialidadFilter === "todos" ? null : p.especialidadFilter}
        onChange={(v) => p.setEspecialidadFilter(v === null ? "todos" : v)}
      />

      <div className={s.cargar}>
        <Button leftIcon={<Plus size={16} aria-hidden="true" />} onClick={p.openCreate}>
          Cargar precio
        </Button>
      </div>
    </div>
  );
}
