import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useAppSnackbar } from "@/app/hooks/useAppSnackbar";
import { useCapaCarga } from "./capaCargaContexto";
import { useEffect, useMemo } from "react";
import { cargarCatalogos, useCatalogosCarga } from "./catalogosCarga";
import { usePeriodoActivo } from "./hooks/usePeriodoActivo";
import { useCargaEstadoModos } from "./useCargaEstadoModos";
import { useCargaEstadoCabecera } from "./useCargaEstadoCabecera";
import { useCargaEstadoPrestacion } from "./useCargaEstadoPrestacion";
import { useCargaEstadoPantalla } from "./useCargaEstadoPantalla";

/** Parte de la lógica de CargaFacturacion: parámetros de la ruta, catálogos y estado del formulario, repartido en cuatro hooks. */
export function useCargaContexto() {
  const navigate = useNavigate();
  const notify = useAppSnackbar();
  // Dentro de la capa de edición rápida (ver CapaCarga) la ruta que matcheó es la del
  // listado de atrás: el id y el `from` de la edición los da la capa.
  const capa = useCapaCarga();
  const params = useParams<{ id: string; facturaId: string }>();
  const editId = capa ? capa.editId : params.id;
  const complementoParam = capa ? undefined : params.facturaId;
  const [searchParams] = useSearchParams();
  const fromFactura = capa ? capa.from : searchParams.get("from");
  const isEdit = !!editId;
  const isComplemento = !!complementoParam;
  const complementoId = complementoParam ? Number(complementoParam) : null;
  // "Replicar carga": llega por query param en la carga normal (?replicar=<id>) desde
  // las tablas de prestaciones. Precarga todos los campos de esa prestación pero como
  // una carga nueva (POST), no como edición de la original.
  const replicarParam = capa ? null : searchParams.get("replicar");
  const isReplicando = !isEdit && !isComplemento && !!replicarParam;

  // Médicos, obras sociales y clínicas: listas completas para que los autocompletes
  // filtren en memoria (un pedido por tecleo era lento con ~4.000 médicos). Vienen de
  // una caché compartida (`catalogosCarga`): con copia guardada el formulario abre al
  // instante y la versión actual llega de fondo. Sin copia, el formulario espera con
  // "Cargando formulario…" — ver el gate más abajo.
  const { catalogos, error: errorPrecarga } = useCatalogosCarga();
  const medicosPrecargados = catalogos?.medicos ?? null;
  const obrasSocialesPrecargadas = catalogos?.obrasSociales ?? null;
  const clinicasPrecargadas = catalogos?.clinicas ?? null;
  useEffect(() => { cargarCatalogos(); }, []);

  const modos = useCargaEstadoModos({ isReplicando, isComplemento, isEdit, editId, capa });
  const cabecera = useCargaEstadoCabecera();
  const prestacion = useCargaEstadoPrestacion();
  const pantalla = useCargaEstadoPantalla();
  const {
    periodo,
    error: periodoError,
    load: loadPeriodo,
    reset: resetPeriodo,
  } = usePeriodoActivo();

  // El médico que fija el precio y los códigos habilitados: el propio payee si es un médico.
  const codMedicoEfectivo = cabecera.payeeEsOrganizacion ? cabecera.codMedicoEjecutor : cabecera.codMedico;

  // Con clínica (como socio/payee → Sanatorio, o en el campo Clínica → Honorarios individuales) los gastos los factura la clínica.
  const gastosEnCero = cabecera.payeeEsOrganizacion || cabecera.codClinica != null;
  const gastosSugeridos = (valor: string | null | undefined) => (gastosEnCero ? "0" : valor ?? "0");

  // Obra social efectiva para cotizar — la misma cuenta se repetía 3 veces (acá.
  const codObraEfectivo = useMemo(
    () =>
      isComplemento
        ? (modos.complementoMeta?.cod_obra ?? null)
        : cabecera.obraSocial
          ? String(cabecera.obraSocial.nro_obra_social)
          : null,
    [isComplemento, modos.complementoMeta?.cod_obra, cabecera.obraSocial],
  );

  return {
    navigate,
    notify,
    capa,
    params,
    editId,
    complementoParam,
    searchParams,
    fromFactura,
    isEdit,
    isComplemento,
    complementoId,
    replicarParam,
    isReplicando,
    catalogos,
    errorPrecarga,
    medicosPrecargados,
    obrasSocialesPrecargadas,
    clinicasPrecargadas,
    ...modos,
    ...cabecera,
    periodo,
    periodoError,
    loadPeriodo,
    resetPeriodo,
    ...prestacion,
    ...pantalla,
    codMedicoEfectivo,
    gastosEnCero,
    gastosSugeridos,
    codObraEfectivo,
  };
}

export type useCargaContextoCtx = ReturnType<typeof useCargaContexto>;
