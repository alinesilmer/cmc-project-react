import { useEffect } from "react";
import { detailMessage, type PrestacionItem, type PrestacionUpdate, type ViaPractica } from "../types";
import { toInt } from "./carga.helpers";
import { parseMoney } from "../money";
import { anularPrestacion, crearPrestaciones, editarPrestacion } from "../api";
import { comoErrorApi } from "@/app/shared/lib/httpErrors";
import type { useCargaContextoCtx } from "./useCargaContexto";
import type { useCargaPreciosCtx } from "./useCargaPrecios";
import type { useCargaCambiosCtx } from "./useCargaCambios";

/** Parte de la lógica de CargaFacturacion: hidratación al editar, complementar o replicar. El texto es el del componente original. */
export function useCargaEdicion(previo: useCargaContextoCtx & useCargaPreciosCtx & useCargaCambiosCtx) {
  const { navigate, notify, capa, editId, fromFactura, isEdit, isComplemento, editMeta, setEditMeta, setErrorEdicion, setEditHidratado, setMedicoPreset, setCodigoPreset, setClinicaPreset, setEjecutorPreset, autorizacion, codMedico, payeeEsOrganizacion, codMedicoEjecutor, obraSocial, periodo, periodoOverride, afiliadoId, dni, fechaPractica, codClinica, codNomenclador, cantidad, sesion, tipoCalculo, via, porcentaje, honorarios, gastos, coseguro, tipoPrestador, montoAyudante, ayudantes, pediatra, autorizacionPorIntegrante, setGuardando, ayudantesOriginalesRef, pediatraOriginalRef, headPrestacionIdRef, setUltimoMedico, precio, precioPediatra, volverA, validate, resetForm, modoEdicionAnteriorRef } = previo;
  useEffect(() => {
    const salioDeEdicion = modoEdicionAnteriorRef.current && !isEdit;
    modoEdicionAnteriorRef.current = isEdit;
    if (!salioDeEdicion) return;
    setEditMeta(null);
    setEditHidratado(false);
    setErrorEdicion(null);
    setMedicoPreset(null);
    setEjecutorPreset(null);
    setCodigoPreset(null);
    setClinicaPreset(null);
    setUltimoMedico(null);
    ayudantesOriginalesRef.current = [];
    headPrestacionIdRef.current = null;
    resetForm();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEdit]);

  const doGuardarEdit = async () => {
    if (!validate() || !editId) return;
    // Efectivos = lo que está elegido ahora en el form, no el snapshot original de `editMeta`: si el operador cambió la OS/período.
    const obraSocialEfectiva = obraSocial
      ? String(obraSocial.nro_obra_social)
      : editMeta!.cod_obra_social;
    const periodoEfectivo = periodoOverride ?? periodo?.periodo ?? editMeta!.periodo;
    const payload: PrestacionUpdate = {
      cod_medico: codMedico!,
      cod_medico_ejecutor: payeeEsOrganizacion ? codMedicoEjecutor : null,
      cod_obra_social: obraSocialEfectiva,
      periodo: periodoEfectivo,
      afiliado_id: afiliadoId,
      dni_paciente: dni || null,
      fecha_practica: fechaPractica || null,
      cod_clinica: codClinica,
      autorizacion: autorizacion || null,
      cod_nomenclador: codNomenclador!,
      cantidad: toInt(cantidad, 1),
      sesion: toInt(sesion, 1),
      tipo_calculo: tipoCalculo,
      via,
      honorarios: tipoPrestador === "ayudante" ? 0 : parseMoney(honorarios),
      gastos: tipoPrestador === "ayudante" ? 0 : parseMoney(gastos),
      ayudante: tipoPrestador === "ayudante" ? parseMoney(montoAyudante) : 0,
      porcentaje: toInt(porcentaje, 100),
      coseguro: tipoPrestador === "ayudante" ? 0 : parseMoney(coseguro),
    };
    // La cabecera real (no necesariamente editId: puede haberse editado un ayudante).
    const headId = headPrestacionIdRef.current ?? Number(editId);
    setGuardando(true);
    try {
      // 1. Cabecera del equipo.
      await editarPrestacion(headId, payload);

      // 2. Reconciliar los ayudantes del equipo.
      const shared = {
        afiliado_id: afiliadoId,
        dni_paciente: dni || null,
        fecha_practica: fechaPractica || null,
        cod_clinica: codClinica,
        autorizacion: autorizacion || null,
        cod_nomenclador: codNomenclador!,
        via,
      };
      const idsVigentes = new Set<number>();
      const nuevos: PrestacionItem[] = [];
      for (const linea of ayudantes) {
        if (!linea.codMedico) continue;
        const ayAmount =
          linea.tipoCalculo === "A"
            ? parseMoney(precio?.ayudante)
            : parseMoney(linea.precioManual);
        const ayFields = {
          cod_medico: linea.codMedico,
          cod_medico_ejecutor: null,
          ...shared,
          // Con "autorización por integrante" activo, cada ayudante lleva la suya en vez de la de la cabecera (ver comentario equivalente en `doGuardar`).
          autorizacion: autorizacionPorIntegrante
            ? (linea.autorizacion.trim() || null)
            : shared.autorizacion,
          // Mismo criterio que en el alta (doGuardar): el ayudante escala con la cantidad/sesión de la cabecera, no queda fijo en 1.
          cantidad: toInt(cantidad, 1),
          sesion: toInt(sesion, 1),
          tipo_calculo: linea.tipoCalculo,
          honorarios: 0,
          gastos: 0,
          ayudante: ayAmount,
          porcentaje: toInt(linea.porcentaje, 100),
        };
        if (linea.prestacionId) {
          // Existente → PATCH. Va también con la OS/período EFECTIVOS: si la cabecera se movió arriba, el ayudante tiene que moverse con ella .
          idsVigentes.add(linea.prestacionId);
          await editarPrestacion(linea.prestacionId, {
            ...ayFields,
            cod_obra_social: obraSocialEfectiva,
            periodo: periodoEfectivo,
          });
        } else {
          // Nuevo → se crea junto al equipo (mismo grupo_equipo_id que la cabecera).
          nuevos.push({ ...ayFields, grupo_equipo_id: headId });
        }
      }
      // Los nuevos van al mismo período/OS EFECTIVOS del equipo (ya movido si la cabecera cambió de OS/período arriba) — no al `editMeta` original.
      if (nuevos.length > 0) {
        await crearPrestaciones({
          obra_social: obraSocialEfectiva,
          periodo: periodoEfectivo,
          prestaciones: nuevos,
        });
      }
      // 3. Los ayudantes originales que ya no están → se anulan.
      const removidos = ayudantesOriginalesRef.current.filter((id) => !idsVigentes.has(id));
      for (const id of removidos) {
        await anularPrestacion(id);
      }

      // 2b. Reconciliar el PEDIATRA — bloque PARALELO al de ayudantes: no reutiliza ni modifica el de arriba.
      const pediatraOriginalId = pediatraOriginalRef.current;
      if (pediatra?.codMedico && pediatra.codNomenclador) {
        const pedAmount =
          pediatra.tipoCalculo === "A"
            ? parseMoney(precioPediatra?.honorarios)
            : parseMoney(pediatra.precioManual);
        const pedFields = {
          cod_medico: pediatra.codMedico,
          cod_medico_ejecutor: null,
          afiliado_id: afiliadoId,
          dni_paciente: dni || null,
          fecha_practica: fechaPractica || null,
          cod_clinica: codClinica,
          autorizacion: autorizacionPorIntegrante
            ? (pediatra.autorizacion.trim() || null)
            : (autorizacion || null),
          cod_nomenclador: pediatra.codNomenclador,
          via: "T" as ViaPractica,
          // Mismo criterio que el ayudante (ver doGuardarEdit más arriba): escala con la cantidad/sesión de la cabecera.
          cantidad: toInt(cantidad, 1),
          sesion: toInt(sesion, 1),
          tipo_calculo: pediatra.tipoCalculo,
          honorarios: pedAmount,
          gastos: 0,
          ayudante: 0,
          coseguro: 0,
          porcentaje: toInt(pediatra.porcentaje, 100),
          rol: "pediatra" as const,
        };
        if (pediatra.prestacionId) {
          // Existente (misma fila) → PATCH, también con la OS/período efectivos — mismo motivo que con el ayudante.
          await editarPrestacion(pediatra.prestacionId, {
            ...pedFields,
            cod_obra_social: obraSocialEfectiva,
            periodo: periodoEfectivo,
          });
        } else {
          // Nuevo. Si había un pediatra ORIGINAL distinto, se reemplaza: se anula antes de crear el nuevo .
          if (pediatraOriginalId) {
            await anularPrestacion(pediatraOriginalId);
          }
          await crearPrestaciones({
            obra_social: obraSocialEfectiva,
            periodo: periodoEfectivo,
            prestaciones: [{ ...pedFields, grupo_equipo_id: headId }],
          });
        }
      } else if (pediatraOriginalId) {
        // Se quitó el pediatra que había, sin agregar uno nuevo → se anula.
        await anularPrestacion(pediatraOriginalId);
      }

      notify("Prestación actualizada.");
      // Vuelta a la pantalla desde la que se entró a editar (el formulario de carga o
      // el detalle de factura, según el `?from=`). Además de ser lo esperado, evita el
      // riesgo de un segundo guardado sobre un estado desactualizado: los ayudantes
      // recién creados todavía no tienen su `prestacionId` y se duplicarían.
      if (capa) {
        // El listado sigue abajo: se cierra la capa y él se recarga y resalta la fila.
        capa.cerrar(Number(editId));
        return;
      }
      navigate(volverA);
      // Al detalle de factura se vuelve donde se estaba (lo restaura el listado): subir
      // acá lo pisaría.
      const vuelveAlListado = Boolean(fromFactura) && fromFactura !== "carga" && !isComplemento;
      if (!vuelveAlListado) window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (e) {
      const err = comoErrorApi(e);
      notify(
        detailMessage(err?.response?.data?.detail) || "Error al guardar",
        "error",
      );
    } finally {
      setGuardando(false);
    }
  };

  return {
    doGuardarEdit,
  };
}

export type useCargaEdicionCtx = ReturnType<typeof useCargaEdicion>;
