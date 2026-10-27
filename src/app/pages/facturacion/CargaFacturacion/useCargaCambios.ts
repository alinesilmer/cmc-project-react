import { useCallback, useEffect, useMemo, useRef } from "react";
import { type MedicoOption, type ObraSocialOption, type PrestacionItem, type TipoCalculo, type ViaPractica } from "../types";
import { FACTURACION_ULTIMA_OS_KEY } from "../constants";
import { buildAyudantesFromGrupo, buildPediatraFromGrupo, fetchPrestacionCabecera, seleccionPrestadorDe, tieneAutorizacionDistintaPorIntegrante, toInt } from "./carga.helpers";
import { parseMoney } from "../money";
import { fetchClinicas, fetchCodigosHabilitados, fetchMedicos, fetchObraSocialPorCodigo } from "../api";
import { montoPediatra } from "./sections/pediatra.helpers";
import { totalAyudantes } from "./sections/ayudante.helpers";
import { type FocusField } from "./focusNav";
import type { useCargaContextoCtx } from "./useCargaContexto";
import type { useCargaPreciosCtx } from "./useCargaPrecios";

/** Parte de la lógica de CargaFacturacion: qué pasa al cambiar afiliado, obra social o código, y el reseteo. El texto es el del componente original. */
export function useCargaCambios(previo: useCargaContextoCtx & useCargaPreciosCtx) {
  const { notify, fromFactura, isEdit, isComplemento, replicarParam, isReplicando, setLoadingReplicar, setMedicoPreset, setCodigoPreset, setClinicaPreset, setEjecutorPreset, autorizacion, setAutorizacion, codMedico, setCodMedico, setMedicoSeleccionado, payeeEsOrganizacion, setPayeeEsOrganizacion, codMedicoEjecutor, setCodMedicoEjecutor, setMedicoEjecutor, obraSocial, setObraSocial, periodo, loadPeriodo, resetPeriodo, periodoOverride, setPeriodoOverride, afiliadoId, setAfiliadoId, dni, setDni, nombrePaciente, setNombrePaciente, fechaPractica, setFechaPractica, codClinica, setCodClinica, codNomenclador, setCodNomenclador, cantidad, setCantidad, sesion, setSesion, tipoCalculo, setTipoCalculo, via, setVia, porcentaje, setPorcentaje, honorarios, setHonorarios, gastos, setGastos, coseguro, setCoseguro, tipoPrestador, setTipoPrestador, montoAyudante, setMontoAyudante, ayudantes, setAyudantes, pediatra, setPediatra, setAutorizacionPorIntegrante, mantener, setDocumentosNuevos, setErrores, setMedicoResetKey, setEjecutorResetKey, setPacienteResetKey, setNomencladorResetKey, setClinicaResetKey, setOsResetKey, setResetTick, pendingFocusRef, pediatraOriginalRef, precio, precioPediatra, precioPediatraLoading } = previo;

  // eslint-disable-next-line react-hooks/exhaustive-deps -- los setters y refs vienen de otra parte del hook: son estables
  const volverATradicional = useCallback(() => setVia("T"), []);

  const handleObraSocialChange = useCallback(
    (nro: number | null, os: ObraSocialOption | null) => {
      setObraSocial(os);
      resetPeriodo();
      // El código elegido NO se borra acá: los códigos habilitados son por médico, no por obra social (`fetchCodigosHabilitados` no recibe OS).
      if (nro && os) {
        localStorage.setItem(FACTURACION_ULTIMA_OS_KEY, JSON.stringify(os));
        loadPeriodo(String(nro));
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps -- los setters y refs vienen de otra parte del hook: son estables
    [loadPeriodo, resetPeriodo],
  );

  // "Replicar carga": precarga todos los campos de una prestación existente en una carga nueva (no la edita).
  useEffect(() => {
    if (!isReplicando || !replicarParam) return;
    let active = true;
    setLoadingReplicar(true);
    (async () => {
      try {
        // Siempre desde la cabecera: replicar un ayudante debe replicar el equipo con su médico principal en la cabecera.
        const p = await fetchPrestacionCabecera(replicarParam);
        if (!active) return;
        const sel = seleccionPrestadorDe(p);
        const esOrg = sel.ejecutor != null;
        setCodMedico(sel.payee);
        setPayeeEsOrganizacion(esOrg);
        setCodMedicoEjecutor(sel.ejecutor);
        setAfiliadoId(null);
        setDni(p.dni_paciente ?? "");
        setNombrePaciente(p.nombre_paciente ?? "");
        // La fecha es opcional: si la prestación se cargó sin fecha (carga por cantidad) se deja vacía.
        setFechaPractica(p.fecha_practica ?? "");
        setCodClinica(sel.clinica);
        setAutorizacion(p.autorizacion ?? "");
        setCodNomenclador(p.cod_nomenclador ?? null);
        setCantidad(String(p.cantidad ?? 1));
        setSesion(String(p.sesion ?? 1));
        setTipoCalculo((p.tipo_calculo as TipoCalculo) ?? "A");
        setVia((p.via as ViaPractica) ?? "T");
        setPorcentaje(String(p.porcentaje ?? 100));
        const esAyudante = parseMoney(p.ayudante) > 0;
        setTipoPrestador(esAyudante ? "ayudante" : "medico");
        if (esAyudante) {
          setMontoAyudante(p.ayudante != null ? String(p.ayudante) : "0");
          setHonorarios("0");
          setGastos("0");
          setCoseguro("0");
        } else {
          setHonorarios(p.honorarios != null ? String(p.honorarios) : "0");
          setGastos(p.gastos != null ? String(p.gastos) : "0");
          setCoseguro(p.coseguro != null ? String(p.coseguro) : "0");
        }

        const codMedForCodigos = sel.ejecutor ?? sel.payee;
        const [payeeRes, ejeRes, osRes, nomRes, cliRes] = await Promise.allSettled([
          fetchMedicos(sel.payee),
          sel.ejecutor ? fetchMedicos(sel.ejecutor) : Promise.resolve([]),
          p.cod_obra_social ? fetchObraSocialPorCodigo(p.cod_obra_social) : Promise.resolve([]),
          p.cod_nomenclador
            ? fetchCodigosHabilitados(codMedForCodigos, p.cod_nomenclador)
            : Promise.resolve([]),
          sel.clinica != null ? fetchClinicas(String(sel.clinica)) : Promise.resolve([]),
        ]);
        if (!active) return;

        if (payeeRes.status === "fulfilled") {
          const m = payeeRes.value.find((x) => String(x.cod) === sel.payee);
          if (m) {
            setMedicoSeleccionado(m);
            setMedicoPreset(
              [m.nombre, m.matricula].filter((v) => v != null && v !== "").join(" · ") || null,
            );
          }
        }
        if (ejeRes.status === "fulfilled") {
          const m = (ejeRes.value as MedicoOption[]).find((x) => String(x.cod) === sel.ejecutor);
          if (m) {
            setMedicoEjecutor(m);
            setEjecutorPreset(
              [m.nombre, m.matricula].filter((v) => v != null && v !== "").join(" · ") || null,
            );
          }
        }
        if (osRes.status === "fulfilled") {
          const os = osRes.value.find((x) => String(x.nro_obra_social) === p.cod_obra_social);
          // Fija la OS y dispara la carga del período automático — el período de la prestación original no se replica.
          if (os) {
            setObraSocial(os);
            localStorage.setItem(FACTURACION_ULTIMA_OS_KEY, JSON.stringify(os));
            loadPeriodo(String(os.nro_obra_social));
          }
        }
        if (nomRes.status === "fulfilled") {
          const nom = nomRes.value.find((x) => x.codigo === p.cod_nomenclador);
          if (nom) {
            setCodigoPreset(nom.descripcion || null);
          }
        }
        if (cliRes.status === "fulfilled") {
          const cli = cliRes.value.find((x) => x.cod === sel.clinica);
          if (cli) setClinicaPreset(cli.nombre || null);
        }
        // Ayudantes del equipo. Va después de setear codNomenclador.
        if (p.grupo && p.grupo.length > 0) {
          const lineas = await buildAyudantesFromGrupo(p.grupo);
          if (active) {
            setAyudantes(lineas);
            if (tieneAutorizacionDistintaPorIntegrante(p, lineas)) {
              setAutorizacionPorIntegrante(true);
            }
          }
          // Pediatra del equipo (si hay) — se replica igual que los ayudantes: al guardar se crea una fila nueva (`doGuardar` no mira `prestacionId`).
          const lineaPediatra = await buildPediatraFromGrupo(p.grupo);
          if (active && lineaPediatra) setPediatra(lineaPediatra);
        }
      } catch {
        notify("No se pudo cargar la prestación a replicar.", "error");
      } finally {
        if (active) setLoadingReplicar(false);
      }
    })();
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isReplicando, replicarParam]);

  // A dónde se vuelve al salir del formulario: con el botón "Volver" y, en edición, también después de guardar.
  const volverA = isComplemento
    ? "/panel/facturacion/complementarias"
    : fromFactura === "carga"
      ? "/panel/facturacion/carga"
      : fromFactura
        ? `/panel/facturacion/periodos/${fromFactura}`
        : "/panel/facturacion/periodos";

  const totalEstimado = useMemo(() => {
    const porc = toInt(porcentaje, 100);
    const cant = toInt(cantidad, 1);
    const ses = toInt(sesion, 1);
    if (tipoPrestador === "ayudante") {
      const a = parseMoney(montoAyudante);
      return a * (porc / 100) * cant * ses;
    }
    const h = parseMoney(honorarios);
    const g = parseMoney(gastos);
    const cos = parseMoney(coseguro);
    // El coseguro no se escala por porcentaje (mismo criterio que el backend, `calcular_importe_total`); sí escala por cantidad/sesión, igual que el resto.
    const base = ((h + g) * (porc / 100) - cos) * cant * ses;
    // Ayudante y pediatra escalan por cantidad/sesión igual que el cirujano (ver doGuardar).
    const pedMonto = pediatra ? montoPediatra(pediatra, precioPediatra) * cant * ses : 0;
    return base + totalAyudantes(ayudantes, precio, cant, ses) + pedMonto;
  }, [
    tipoPrestador, montoAyudante, honorarios, gastos, coseguro, porcentaje, cantidad, sesion,
    ayudantes, precio, pediatra, precioPediatra,
  ]);

  const buildMainItem = (): PrestacionItem => ({
    cod_medico: codMedico!,
    // El ejecutor solo se manda si el payee es una clínica.
    cod_medico_ejecutor: payeeEsOrganizacion ? codMedicoEjecutor : null,
    afiliado_id: afiliadoId,
    dni_paciente: dni || null,
    nombre_paciente: nombrePaciente || null,
    // Opcional: sin fecha el backend guarda NULL y cotiza al valor vigente de hoy.
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
    // Solo la fila principal lleva coseguro — nunca la de ayudante (el acto es uno solo).
    coseguro: tipoPrestador === "ayudante" ? 0 : parseMoney(coseguro),
    grupo_equipo_id: null,
    // Código dado de alta sin precio: qué conceptos cotizar cuando se revalorice.
    concepto_sin_precio: precio?.sin_precio ? (tipoPrestador === "ayudante" ? "A" : "HG") : null,
  });

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    // La complementaria fija OS/período (van en el badge, no son campos del form).
    if (!isComplemento) {
      if (!obraSocial) errs.obraSocial = "Requerido";
      // Sin automático, un período elegido a mano ("Elegir período" — obra social sin período cerrado previo) es válido igual.
      if (!periodo && !periodoOverride) errs.periodo = "Sin período activo";
      if (periodoOverride && periodo && periodoOverride < periodo.periodo) {
        errs.periodo = `El período no puede ser anterior a ${periodo.periodo_label}`;
      }
    }
    if (!codMedico) errs.codMedico = "Requerido";
    if (payeeEsOrganizacion && !codMedicoEjecutor)
      errs.codMedicoEjecutor = "Requerido — indicá el médico que ejecutó";
    if (!codNomenclador) errs.codNomenclador = "Requerido";
    // Código no admitido / sin precio ya no bloquea el guardado — PrecioPreviewCard muestra el aviso "⚠ {motivo}" igual.
    if (
      tipoPrestador === "ayudante" &&
      tipoCalculo === "A" &&
      parseMoney(montoAyudante) <= 0
    ) {
      errs.montoAyudante =
        "Este código no tiene valor de ayudante — pasá a cálculo Manual y cargá el importe";
    }
    if (ayudantes.length > 0) {
      const vistos = new Set<string>();
      ayudantes.forEach((linea, idx) => {
        if (!linea.codMedico) {
          errs[`ayudante_${idx}`] = "Seleccioná el médico ayudante";
        } else if (linea.codMedico === codMedico) {
          errs[`ayudante_${idx}`] =
            "El ayudante no puede ser el mismo médico principal";
        } else if (vistos.has(linea.codMedico)) {
          errs[`ayudante_${idx}`] = "Ese médico ya está agregado como ayudante";
        }
        if (linea.codMedico) vistos.add(linea.codMedico);
      });
    }
    if (pediatra) {
      if (!pediatra.codMedico) {
        errs.pediatra = "Seleccioná el médico pediatra";
      } else if (pediatra.codMedico === codMedico) {
        errs.pediatra = "El pediatra no puede ser el mismo médico principal";
      } else if (ayudantes.some((a) => a.codMedico === pediatra.codMedico)) {
        errs.pediatra = "Ese médico ya está cargado como ayudante";
      }
      if (!pediatra.codNomenclador) {
        errs.pediatraCodigo = "Elegí el código que factura el pediatra";
      } else if (
        pediatra.tipoCalculo === "A" &&
        !precioPediatraLoading &&
        parseMoney(precioPediatra?.honorarios) <= 0
      ) {
        errs.pediatraCodigo =
          "Este código no tiene valor de honorarios — pasá a Manual y cargá el importe";
      }
    }
    setErrores(errs);
    return Object.keys(errs).length === 0;
  };

  const resetForm = () => {
    // El código suele repetirse en una tanda (misma práctica para varios médicos o pacientes seguidos).
    if (!mantener.codigo) {
      setCodNomenclador(null);
      setHonorarios("0");
      setGastos("0");
      setCoseguro("0");
      setNomencladorResetKey((k) => k + 1);
    }
    setDocumentosNuevos([]);
    setTipoCalculo("A");
    setVia("T");
    setPorcentaje("100");
    setCantidad("1");
    setSesion("1");
    setAyudantes([]);
    setPediatra(null);
    pediatraOriginalRef.current = null;
    setTipoPrestador("medico");
    setMontoAyudante("0");
    // El Nº de autorización suele repetirse en una tanda (la OS autoriza varias prácticas con el mismo número), por eso se puede mantener entre cargas.
    if (!mantener.autorizacion) setAutorizacion("");
    // Si el payee es una clínica, "Mantener clínica" también aplica al Nº de socio: es el mismo dato (la clínica se carga ahí.
    const medicoMantenidoPorClinica = mantener.clinica && payeeEsOrganizacion;
    if (!mantener.medico && !medicoMantenidoPorClinica) {
      setCodMedico(null);
      setMedicoSeleccionado(null);
      setPayeeEsOrganizacion(false);
      setCodMedicoEjecutor(null);
      setMedicoEjecutor(null);
      setMedicoResetKey((k) => k + 1);
      setEjecutorResetKey((k) => k + 1);
    } else if (!mantener.medico) {
      // Se mantuvo el payee por "Mantener clínica", pero el médico ejecutor es un dato de la práctica puntual.
      setCodMedicoEjecutor(null);
      setMedicoEjecutor(null);
      setEjecutorResetKey((k) => k + 1);
    }
    if (!mantener.paciente) {
      setAfiliadoId(null);
      setDni("");
      setNombrePaciente("");
      setPacienteResetKey((k) => k + 1);
    }
    if (!mantener.fecha) {
      setFechaPractica("");
    }
    if (!mantener.clinica) {
      setCodClinica(null);
      setClinicaPreset(null);
      setClinicaResetKey((k) => k + 1);
    }
    if (!mantener.obraSocial) {
      setObraSocial(null);
      resetPeriodo();
      setPeriodoOverride(null);
      setOsResetKey((k) => k + 1);
    }
    setErrores({});
    setResetTick((k) => k + 1);

    // Campos que quedaron vacíos, en el orden en que están en pantalla: el efecto de abajo enfoca el primero que exista.
    const pendientes: FocusField[] = [];
    if (!mantener.medico && !medicoMantenidoPorClinica) {
      pendientes.push("medico");
    } else if (!mantener.medico) {
      // El payee quedó (por "Mantener clínica") pero el ejecutor se limpió: es el primer campo realmente vacío, no "Nº socio" (que ya tiene la clínica).
      pendientes.push("medicoEjecutor");
    }
    if (!mantener.obraSocial) pendientes.push("obraSocial");
    if (!mantener.paciente) pendientes.push("paciente");
    if (!mantener.fecha) pendientes.push("fecha");
    if (!mantener.codigo) pendientes.push("codigo");
    pendingFocusRef.current = pendientes;
  };

  // Salir de la edición hacia el alta (`/carga/:id` → `/carga`) NO remonta el componente.
  const modoEdicionAnteriorRef = useRef(isEdit);

  return {
    volverATradicional,
    handleObraSocialChange,
    volverA,
    totalEstimado,
    buildMainItem,
    validate,
    resetForm,
    modoEdicionAnteriorRef,
  };
}

export type useCargaCambiosCtx = ReturnType<typeof useCargaCambios>;
