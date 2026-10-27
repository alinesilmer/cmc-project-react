import { Building2 } from "lucide-react";

import FiltrosPorOS from "./components/FiltrosPorOS";
import PendientesAlta from "./components/PendientesAlta";
import TablaValoresOS from "./components/TablaValoresOS";
import type { PorOSCtx } from "./useNomencladorPorOS";
import Cargando from "@/app/components/ui/Cargando/Cargando";
import Paginador from "@/app/components/ui/Paginador/Paginador";
import Vacio from "@/app/components/ui/Vacio/Vacio";

/** Lo que se ve una vez elegida la obra social: filtros, códigos sin precio, la tabla de valores y el paginador. */
export default function PorOSContenido({ ctx }: { ctx: PorOSCtx }) {
  const { selectedNroOS, showLoading, hayFiltros, grouped, especialidadFilter, pageGroups, page, setPage, totalPages } = ctx;

  if (!selectedNroOS) return <Vacio icono={Building2}>Elegí una obra social para ver sus códigos y precios</Vacio>;

  return (
    <>
      <FiltrosPorOS
        codeSearch={ctx.codeSearch}
        setCodeSearch={ctx.setCodeSearch}
        soloPresupuesto={ctx.soloPresupuesto}
        setSoloPresupuesto={ctx.setSoloPresupuesto}
        tipoFilter={ctx.tipoFilter}
        setTipoFilter={ctx.setTipoFilter}
        especialidades={ctx.especialidades}
        especialidadFilter={especialidadFilter}
        setEspecialidadFilter={ctx.setEspecialidadFilter}
        openCreate={ctx.openCreate}
      />

      <PendientesAlta pendientes={ctx.pendientes} abrirCargaPrecio={ctx.abrirCargaPrecio} selectedNroOS={selectedNroOS} />

      {showLoading ? (
        <Vacio icono={Building2}>
          <Cargando size={18} tono="marca" /> Cargando valores…
        </Vacio>
      ) : !hayFiltros ? (
        <Vacio icono={Building2}>Buscá un código, elegí un tipo o una especialidad, o filtrá por «Por presupuesto»</Vacio>
      ) : grouped.length === 0 ? (
        <Vacio icono={Building2}>{especialidadFilter !== "todos" ? "Sin códigos de esta especialidad" : "Sin códigos cargados"}</Vacio>
      ) : (
        <>
          <TablaValoresOS
            pageGroups={pageGroups}
            resolvedDesc={ctx.resolvedDesc}
            espMap={ctx.espMap}
            openEdit={ctx.openEdit}
            openEditNucleo={ctx.openEditNucleo}
            handleDelete={ctx.handleDelete}
          />
          <Paginador
            pagina={page}
            totalPaginas={totalPages}
            onCambiar={setPage}
            resumen={`${grouped.length} código${grouped.length !== 1 ? "s" : ""}`}
          />
        </>
      )}
    </>
  );
}
