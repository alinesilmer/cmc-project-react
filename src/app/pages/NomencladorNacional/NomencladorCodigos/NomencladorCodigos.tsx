import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { ListOrdered } from "lucide-react";

import FiltrosCodigos from "./components/FiltrosCodigos";
import TablaCodigos from "./components/TablaCodigos";
import { useCodigosCatalogo } from "./useCodigosCatalogo";
import type { NomencladorOut } from "../nomenclador.types";
import { usePermisos } from "@/app/auth/usePermisos";
import PaginaPasos from "@/app/components/layout/PaginaPasos/PaginaPasos";
import Cargando from "@/app/components/ui/Cargando/Cargando";
import Paginador from "@/app/components/ui/Paginador/Paginador";
import { ErrorAccion } from "@/app/components/ui/ResultadoAccion/ResultadoAccion";
import Vacio from "@/app/components/ui/Vacio/Vacio";
import { useConfirmacion } from "@/app/hooks/useConfirmacion";

const RUTA_FORM = "/panel/nomenclador/codigos";

/** Catálogo de códigos del Colegio: se busca, se filtra, se activa o desactiva y se entra al alta y la edición. */
export default function NomencladorCodigos() {
  const navigate = useNavigate();
  const { can } = usePermisos();
  const { pedir, modal } = useConfirmacion();
  const h = useCodigosCatalogo();
  const { alternar, eliminar } = h;

  const puedeEditar = can("nomenclador:editar");
  const puedeEliminar = can("nomenclador:eliminar");

  // Un objeto nuevo por render rompería la memoria de las filas.
  const acciones = useMemo(
    () => ({
      puedeAlternar: puedeEditar,
      onAlternar: (item: NomencladorOut) => void alternar(item),
      onEditar: puedeEditar ? (item: NomencladorOut) => navigate(`${RUTA_FORM}/${item.id}/editar`) : undefined,
      onEliminar: puedeEliminar
        ? (item: NomencladorOut) =>
            pedir(
              { titulo: "Eliminar código", mensaje: `¿Eliminar el código ${item.codigo} para siempre? No se puede deshacer.` },
              () => void eliminar(item.id),
            )
        : undefined,
    }),
    [puedeEditar, puedeEliminar, navigate, pedir, alternar, eliminar],
  );

  return (
    <PaginaPasos titulo="Gestión de códigos" icono={ListOrdered} ancha>
      <FiltrosCodigos
        busqueda={h.busqueda}
        onBusqueda={h.setBusqueda}
        tipo={h.tipo}
        onTipo={h.setTipo}
        complejidad={h.complejidad}
        onComplejidad={h.setComplejidad}
        estado={h.estado}
        onEstado={h.setEstado}
        onNuevo={puedeEditar ? () => navigate(`${RUTA_FORM}/nuevo`) : undefined}
      />

      {h.fallo && <ErrorAccion>No se pudieron cargar los códigos. Intentá de nuevo.</ErrorAccion>}

      {h.cargando ? (
        <Vacio icono={ListOrdered}>
          <Cargando size={18} tono="marca" /> Cargando códigos…
        </Vacio>
      ) : h.items.length === 0 ? (
        <Vacio icono={ListOrdered}>Sin resultados</Vacio>
      ) : (
        <TablaCodigos items={h.items} nnPorId={h.nnPorId} acciones={acciones} actualizando={h.actualizando} />
      )}

      <Paginador pagina={h.pagina} hayMas={h.hayMas} onCambiar={h.setPagina} ocupado={h.actualizando} />
      {modal}
    </PaginaPasos>
  );
}
