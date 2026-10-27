import { detailMessage, type PrestacionItem } from "../types";
import { parseMoney } from "../money";
import { toInt } from "./carga.helpers";
import { agregarDocumentosPrestacion, crearPrestaciones, crearPrestacionesComplementaria } from "../api";
import { comoErrorApi, detalleObjeto } from "@/app/shared/lib/httpErrors";
import { isMod, isModalOpen, useHotkeys } from "./hooks/useHotkeys";
import type { useCargaContextoCtx } from "./useCargaContexto";
import type { useCargaPreciosCtx } from "./useCargaPrecios";
import type { useCargaCambiosCtx } from "./useCargaCambios";
import type { useCargaEdicionCtx } from "./useCargaEdicion";

/** Parte de la lógica de CargaFacturacion: guardar la prestación y validar. El texto es el del componente original. */
export function useCargaGuardado(previo: useCargaContextoCtx & useCargaPreciosCtx & useCargaCambiosCtx & useCargaEdicionCtx) {
  const { notify, isEdit, isComplemento, complementoId, complementoMeta, editMeta, loadingEdit, codMedico, medicoSeleccionado, payeeEsOrganizacion, codMedicoEjecutor, obraSocial, periodo, periodoError, periodoOverride, codNomenclador, ayudantes, pediatra, autorizacionPorIntegrante, guardando, setGuardando, documentosNuevos, duplicado, setDuplicado, setUltimoMedico, setRefreshKey, precio, precioLoading, precioPediatra, buildMainItem, validate, resetForm, doGuardarEdit } = previo;

  const doGuardar = async (confirmarDuplicado = false) => {
    if (isEdit) {
      await doGuardarEdit();
      return;
    }
    if (!validate()) return;

    const mainItem = buildMainItem();
    const items: PrestacionItem[] = [mainItem];

    for (const linea of ayudantes) {
      if (!linea.codMedico) continue;
      const ayAmount =
        linea.tipoCalculo === "A"
          ? parseMoney(precio?.ayudante)
          : parseMoney(linea.precioManual);
      items.push({
        cod_medico: linea.codMedico,
        // El ayudante es un médico payee: nunca lleva ejecutor.
        cod_medico_ejecutor: null,
        afiliado_id: mainItem.afiliado_id,
        dni_paciente: mainItem.dni_paciente,
        nombre_paciente: mainItem.nombre_paciente,
        fecha_practica: mainItem.fecha_practica,
        cod_clinica: mainItem.cod_clinica,
        // Por defecto es un dato de la práctica, no del prestador: se copia igual que dni/fecha/clínica.
        autorizacion: autorizacionPorIntegrante
          ? (linea.autorizacion.trim() || null)
          : mainItem.autorizacion,
        cod_nomenclador: mainItem.cod_nomenclador!,
        via: mainItem.via,
        // El ayudante asiste la misma cantidad/sesión que el cirujano: si la práctica se cargó ×N, el ayudante también cobra ×N.
        cantidad: mainItem.cantidad,
        sesion: mainItem.sesion,
        tipo_calculo: linea.tipoCalculo,
        honorarios: 0,
        gastos: 0,
        ayudante: ayAmount,
        porcentaje: toInt(linea.porcentaje, 100),
        grupo_equipo_id: null,
        concepto_sin_precio: precio?.sin_precio ? "A" : null,
      });
    }

    // Pediatra: va AL FINAL (después de los ayudantes) y nunca es `items[0]` .
    if (pediatra?.codMedico && pediatra.codNomenclador) {
      const pedAmount =
        pediatra.tipoCalculo === "A"
          ? parseMoney(precioPediatra?.honorarios)
          : parseMoney(pediatra.precioManual);
      items.push({
        cod_medico: pediatra.codMedico,
        cod_medico_ejecutor: null,
        afiliado_id: mainItem.afiliado_id,
        dni_paciente: mainItem.dni_paciente,
        nombre_paciente: mainItem.nombre_paciente,
        fecha_practica: mainItem.fecha_practica,
        cod_clinica: mainItem.cod_clinica,
        autorizacion: autorizacionPorIntegrante
          ? (pediatra.autorizacion.trim() || null)
          : mainItem.autorizacion,
        // Código PROPIO del pediatra — NO el del cirujano.
        cod_nomenclador: pediatra.codNomenclador,
        via: "T",
        // Mismo criterio que el ayudante: escala con la cantidad/sesión de la cabecera.
        cantidad: mainItem.cantidad,
        sesion: mainItem.sesion,
        tipo_calculo: pediatra.tipoCalculo,
        // El pediatra cobra honorarios (de su código).
        honorarios: pedAmount,
        gastos: 0,
        ayudante: 0,
        porcentaje: toInt(pediatra.porcentaje, 100),
        // Coseguro siempre 0 en la fila del pediatra — lo cubre el cirujano.
        coseguro: 0,
        grupo_equipo_id: null,
        rol: "pediatra",
      });
    }

    setGuardando(true);
    try {
      // El complemento se referencia por factura_id (no manda obra_social ni período).
      const result = isComplemento
        ? await crearPrestacionesComplementaria(
            { factura_id: complementoId!, prestaciones: items },
            confirmarDuplicado,
          )
        : await crearPrestaciones(
            {
              obra_social: String(obraSocial!.nro_obra_social),
              periodo: periodoOverride,
              prestaciones: items,
            },
            confirmarDuplicado,
          );
      notify(
        `Prestación guardada — total ${result.importe_total}` +
          (result.periodo ? ` (período ${result.periodo})` : ""),
      );
      // Los documentos van a la prestación principal (la primera); si falla la subida, la prestación ya quedó guardada
      // como «Falta documentación» y se completa desde la edición.
      if (documentosNuevos.length > 0 && result.ids?.length) {
        try {
          await agregarDocumentosPrestacion(result.ids[0], documentosNuevos);
        } catch (err) {
          const error = comoErrorApi(err);
          notify(
            `La prestación se guardó, pero no se pudieron subir los documentos: ${(detailMessage(error?.response?.data?.detail) || "error al subirlos").replace(/\.$/, "")}. Completalos desde la edición.`,
            "warning",
          );
        }
      }
      // Antes de resetear: el reset puede limpiar el médico y la tabla lo necesita para seguir mostrando lo que se acaba de cargar.
      setUltimoMedico(medicoSeleccionado);
      setRefreshKey((k) => k + 1);
      resetForm();
    } catch (e) {
      const err = comoErrorApi(e);
      const status = err?.response?.status;
      const detail = err?.response?.data?.detail;
      const conflicto = detalleObjeto(e);
      if (status === 409 && conflicto?.duplicado !== undefined) {
        setDuplicado({ mensaje: detailMessage(detail), id: conflicto.duplicado });
      } else {
        notify(detailMessage(detail) || "Error al guardar", "error");
      }
    } finally {
      setGuardando(false);
    }
  };

  // Si el payee es una clínica, no se puede guardar sin el médico ejecutor.
  const ejecutorOk = !payeeEsOrganizacion || !!codMedicoEjecutor;
  // El período editado no puede ser anterior al automático (el backend lo rechaza con 422).
  const periodoOk = !periodoOverride || !periodo || periodoOverride >= periodo.periodo;
  // Resuelto = hay automático, o el operador ya eligió uno a mano con "Elegir período" (caso de obra social sin período cerrado previo.
  const periodoResuelto = !!periodo || !!periodoOverride;
  const periodoErrorBloquea = periodoError && !periodoOverride;

  const canGuardar = isEdit
    ? !!obraSocial &&
      periodoResuelto &&
      !periodoErrorBloquea &&
      periodoOk &&
      !!codMedico &&
      ejecutorOk &&
      !!codNomenclador &&
      !guardando &&
      !precioLoading &&
      !loadingEdit &&
      editMeta?.estado === "A"
    : isComplemento
      ? !!codMedico &&
        ejecutorOk &&
        !!codNomenclador &&
        !guardando &&
        !precioLoading &&
        !!complementoMeta
      : !!obraSocial &&
        periodoResuelto &&
        !periodoErrorBloquea &&
        periodoOk &&
        !!codMedico &&
        ejecutorOk &&
        !!codNomenclador &&
        !guardando &&
        !precioLoading;

  // Atajos de teclado. `canGuardar` ya cubre el doble submit: incluye !guardando.
  useHotkeys((e) => {
    if (!isMod(e) || e.altKey) return;
    if (duplicado || isModalOpen()) return;

    if (e.key === "Enter") {
      e.preventDefault();
      if (!canGuardar) return;
      doGuardar();
      return;
    }
    // toLowerCase cubre Caps Lock; el guard de shift evita Ctrl+Shift+L.
    if (e.key.toLowerCase() === "l" && !e.shiftKey) {
      e.preventDefault();
      if (guardando || isEdit) return;
      resetForm();
    }
  });

  return {
    doGuardar,
    ejecutorOk,
    periodoOk,
    periodoResuelto,
    periodoErrorBloquea,
    canGuardar,
  };
}

export type useCargaGuardadoCtx = ReturnType<typeof useCargaGuardado>;
