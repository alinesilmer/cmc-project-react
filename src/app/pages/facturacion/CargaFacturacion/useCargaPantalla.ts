import React, { useEffect, useRef } from "react";
import { focusFirstField, nextFocusable } from "./focusNav";
import type { useCargaContextoCtx } from "./useCargaContexto";
import type { useCargaPreciosCtx } from "./useCargaPrecios";
import type { useCargaCambiosCtx } from "./useCargaCambios";
import type { useCargaEdicionCtx } from "./useCargaEdicion";
import type { useCargaGuardadoCtx } from "./useCargaGuardado";

/** Parte de la lógica de CargaFacturacion: ayudas de pantalla y valores derivados. El texto es el del componente original. */
export function useCargaPantalla(previo: useCargaContextoCtx & useCargaPreciosCtx & useCargaCambiosCtx & useCargaEdicionCtx & useCargaGuardadoCtx) {
  const { isEdit, isComplemento, complementoMeta, loadingComplemento, editMeta, loadingEdit, medicoSeleccionado, payeeEsOrganizacion, periodo, periodoOverride, codClinica, tipoPrestador, ayudantes, pediatra, guardando, resetTick, formRef, pendingFocusRef, ultimoMedico, codObraEfectivo, precio, precioLoading } = previo;

  // Devuelve el foco al primer campo por cargar.
  useEffect(() => {
    if (!pendingFocusRef.current || guardando) return;
    focusFirstField(formRef.current, pendingFocusRef.current);
    pendingFocusRef.current = null;
  // eslint-disable-next-line react-hooks/exhaustive-deps -- los setters y refs vienen de otra parte del hook: son estables
  }, [resetTick, guardando]);

  // Con el mouse el foco llega en el mousedown: si el centrado mueve el campo antes del
  // mouseup, el click cae afuera y no se marca (los radios de Tipo de prestador/cálculo).
  // Por eso, si hay un botón apretado, se centra recién cuando terminó el click.
  const punteroAbajoRef = useRef(false);
  const marcarPuntero = () => {
    punteroAbajoRef.current = true;
    window.addEventListener("pointerup", () => { punteroAbajoRef.current = false; }, { once: true });
  };

  // Enter avanza al campo siguiente.
  const centrarCampoEnfocado = (e: React.FocusEvent<HTMLDivElement>) => {
    const el = e.target as HTMLElement;
    if (!/^(INPUT|SELECT|TEXTAREA)$/.test(el.tagName)) return;
    const centrar = () => el.scrollIntoView({ behavior: "smooth", block: "center" });
    if (!punteroAbajoRef.current) { centrar(); return; }
    // setTimeout: el click se despacha después del pointerup, en la misma tarea.
    window.addEventListener("pointerup", () => window.setTimeout(centrar, 0), { once: true });
  };

  const handleFormKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    punteroAbajoRef.current = false;
    if (e.key !== "Enter") return;
    if (e.shiftKey || e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.defaultPrevented) return;

    const el = e.target as HTMLElement;
    if (el.closest('[aria-expanded="true"]')) return;
    if (el.tagName === "BUTTON" || el.tagName === "TEXTAREA") return;

    const next = nextFocusable(formRef.current, el);
    if (!next) return;
    e.preventDefault();
    next.focus({ preventScroll: true });
  };

  // Los campos ya no se bloquean por orden de carga (p. ej. no hace falta elegir Obra Social antes de tocar Paciente/Fecha/Código/etc.).
  const formDisabled = isEdit
    ? loadingEdit || guardando || editMeta?.estado !== "A"
    : isComplemento
      ? loadingComplemento || guardando || !complementoMeta
      : guardando;
  const maxAyudantes = precio?.cantidad_ayudantes ?? 0;
  // La sección se muestra (en carga, replicar y edición) si la prestación es de
  // Honorarios individuales o Sanatorio —por la categoría del código o porque la
  // clínica lo fuerza—, si el código reporta ayudantes, o si ya hay líneas cargadas.
  // Un código HI/Sanatorio sin `cantidad_ayudantes` cargado no la bloquea.
  // No aplica cuando esta carga ES un ayudante suelto (tipoPrestador="ayudante"): ese
  // modo factura un único monto y no arma equipo.
  const tipoConEquipo =
    precio?.tipo_codigo === "Honorarios individuales" ||
    precio?.tipo_codigo === "Sanatorio" ||
    payeeEsOrganizacion ||
    codClinica != null;
  const admiteAyudante =
    tipoPrestador === "medico" &&
    !!precio && !precioLoading && (tipoConEquipo || maxAyudantes > 0 || ayudantes.length > 0);

  // Sección Pediatra: mismo criterio de "medico + precio resuelto" que ayudantes, más el flag que trae el código (`admite_pediatra` — sólo parto/cesárea).
  const admitePediatra =
    tipoPrestador === "medico" &&
    !!precio && !precioLoading && (!!precio.admite_pediatra || !!pediatra);

  // El médico del formulario mientras haya uno; si el reset lo limpió, el último que se guardó.
  const medicoTabla = medicoSeleccionado ?? ultimoMedico;

  const codObraTabla = codObraEfectivo;
  const periodoTabla = isComplemento
    ? (complementoMeta?.periodo ?? null)
    : (periodoOverride ?? periodo?.periodo ?? null);

  return {
    centrarCampoEnfocado,
    marcarPuntero,
    handleFormKeyDown,
    formDisabled,
    maxAyudantes,
    tipoConEquipo,
    admiteAyudante,
    admitePediatra,
    medicoTabla,
    codObraTabla,
    periodoTabla,
  };
}

