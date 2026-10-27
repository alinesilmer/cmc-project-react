import { useNomencladorPrecio } from "./hooks/useNomencladorPrecio";
import { useAutorizacionExistente } from "./hooks/useAutorizacionExistente";
import { useCallback, useEffect } from "react";
import { buildAyudantesFromGrupo, buildPediatraFromGrupo, fetchPrestacionCabecera, seleccionPrestadorDe, tieneAutorizacionDistintaPorIntegrante } from "./carga.helpers";
import { esperarCatalogos } from "./catalogosCarga";
import { detailMessage, type AfiliadoRead, type MedicoOption, type TipoCalculo, type ViaPractica } from "../types";
import { parseMoney } from "../money";
import { fetchAfiliado, fetchClinicas, fetchCodigosHabilitados, fetchFacturaDetalle } from "../api";
import type { useCargaContextoCtx } from "./useCargaContexto";

/** Parte de la lógica de CargaFacturacion: precios del código y efectos de carga. El texto es el del componente original. */
export function useCargaPrecios(previo: useCargaContextoCtx) {
  const { notify, editId, isEdit, isComplemento, complementoId, loadingReplicar, setComplementoMeta, setLoadingComplemento, setComplementoError, setEditMeta, loadingEdit, setLoadingEdit, setErrorEdicion, setEditHidratado, setMedicoPreset, setCodigoPreset, setClinicaPreset, setEjecutorPreset, autorizacion, setAutorizacion, setCodMedico, setMedicoSeleccionado, setPayeeEsOrganizacion, setCodMedicoEjecutor, setMedicoEjecutor, setObraSocial, loadPeriodo, afiliadoId, setAfiliadoId, dni, setDni, setNombrePaciente, fechaPractica, setFechaPractica, setCodClinica, codNomenclador, setCodNomenclador, setCantidad, setSesion, tipoCalculo, setTipoCalculo, via, setVia, setPorcentaje, setHonorarios, setGastos, setCoseguro, tipoPrestador, setTipoPrestador, setMontoAyudante, setAyudantes, pediatra, setPediatra, setAutorizacionPorIntegrante, ayudantesOriginalesRef, pediatraOriginalRef, headPrestacionIdRef, setRefreshKey, codMedicoEfectivo, gastosSugeridos, codObraEfectivo } = previo;

  // Precio del nomenclador (código principal — cirujano/ayudante suelto)
  const {
    precio,
    loading: precioLoading,
    error: precioError,
  } = useNomencladorPrecio({
    codMedico: codMedicoEfectivo,
    codObra: codObraEfectivo,
    codigo: codNomenclador,
    // Sin fecha de práctica el backend cotiza el valor vigente a hoy (el más actual).
    fecha: fechaPractica || null,
    via,
  });

  // ¿El Nº de autorización ya está cargado en esta O.S.? Sólo avisa.
  const autorizacionesExistentes = useAutorizacionExistente(
    codObraEfectivo, autorizacion, editId ? Number(editId) : undefined,
  );

  // Precio del PEDIATRA — socio y código propios, independientes del cirujano.
  const { precio: precioPediatra, loading: precioPediatraLoading } = useNomencladorPrecio({
    codMedico: pediatra?.codMedico ?? null,
    codObra: codObraEfectivo,
    codigo: pediatra?.codNomenclador ?? null,
    fecha: fechaPractica || null,
    // El código del pediatra se cotiza siempre tradicional — la vía es del acto quirúrgico del cirujano, no de la atención del recién nacido.
    via: "T",
  });

  // Precarga de la prestación cuando se entra en modo edición.
  useEffect(() => {
    if (!isEdit || !editId) return;
    let active = true;
    setLoadingEdit(true);
    setErrorEdicion(null);
    (async () => {
      try {
        // Siempre desde la cabecera: si se clickeó "Editar" en un ayudante, resolvemos
        // el médico principal y el equipo real.
        // La prestación se pide sin esperar los catálogos (que en general ya están en
        // la caché): las dos cosas en paralelo.
        const [p, cat] = await Promise.all([fetchPrestacionCabecera(editId), esperarCatalogos()]);
        if (!active) return;
        headPrestacionIdRef.current = p.id;
        // El payee es una clínica sii hay médico ejecutor (Sanatorio o fila legacy).
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
        // La obra social sale de la lista precargada: si el código no está en el catálogo.
        const os = p.cod_obra_social
          ? cat.obrasSociales.find(
              (x) => String(x.nro_obra_social) === String(p.cod_obra_social),
            ) ?? null
          : null;
        setEditMeta({
          cod_obra_social: p.cod_obra_social ?? "",
          // El nombre viene de una columna de ancho fijo: llega con espacios al final.
          cod_obra_social_label: os ? `${os.nro_obra_social} · ${os.nombre.trim()}` : undefined,
          periodo: p.periodo,
          estado: p.estado ?? null,
        });
        // Seedea el campo editable de Obra social/Período con el valor actual de la fila — de acá en más `obraSocial`/`periodo`.
        // su período sigue abierto (gate de `editMeta.estado === "A"` más abajo).
        if (os) {
          setObraSocial(os);
          loadPeriodo(String(os.nro_obra_social));
        }

        // La prestación solo trae códigos: los labels descriptivos se resuelven ANTES de habilitar el render del formulario (`editHidratado`).
        const buscarMedico = (cod: string | null | undefined): MedicoOption | null =>
          cod ? cat.medicos.find((m) => String(m.cod) === String(cod)) ?? null : null;
        const labelMedico = (m: MedicoOption) =>
          [m.nombre, m.matricula].filter((v) => v != null && v !== "").join(" · ") || null;

        const payee = buscarMedico(sel.payee);
        if (payee) {
          setMedicoSeleccionado(payee);
          setMedicoPreset(labelMedico(payee));
        }
        const ejecutor = buscarMedico(sel.ejecutor);
        if (ejecutor) {
          setMedicoEjecutor(ejecutor);
          setEjecutorPreset(labelMedico(ejecutor));
        }

        // Los códigos habilitados dependen del médico efectivo (ejecutor si es clínica).
        // Código, clínica, ayudantes y pediatra son independientes: todos a la vez.
        const codMedForCodigos = sel.ejecutor ?? sel.payee;
        const grupo = p.grupo ?? [];
        const [nomRes, cliRes, ayuRes, pedRes] = await Promise.allSettled([
          p.cod_nomenclador
            ? fetchCodigosHabilitados(codMedForCodigos, p.cod_nomenclador)
            : Promise.resolve([]),
          sel.clinica != null ? fetchClinicas(String(sel.clinica)) : Promise.resolve([]),
          grupo.length > 0 ? buildAyudantesFromGrupo(grupo, cat.medicos) : Promise.resolve([]),
          grupo.length > 0 ? buildPediatraFromGrupo(grupo, cat.medicos) : Promise.resolve(null),
        ]);
        if (!active) return;

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
        // Ayudantes del equipo. Guardamos sus ids originales para reconciliar al
        // guardar (los que se quiten se anulan).
        if (ayuRes.status === "rejected") throw ayuRes.reason;
        const lineas = ayuRes.value;
        if (lineas.length > 0) {
          ayudantesOriginalesRef.current = lineas
            .map((l) => l.prestacionId)
            .filter((v): v is number => v != null);
          setAyudantes(lineas);
          if (tieneAutorizacionDistintaPorIntegrante(p, lineas)) {
            setAutorizacionPorIntegrante(true);
          }
        }
        // Pediatra del equipo (si hay). Bloque paralelo al de arriba, no lo toca.
        if (pedRes.status === "rejected") throw pedRes.reason;
        const lineaPediatra = pedRes.value;
        if (lineaPediatra) {
          pediatraOriginalRef.current = lineaPediatra.prestacionId ?? null;
          setPediatra(lineaPediatra);
        }
        // Recién acá el formulario puede mostrarse: ya está todo, labels incluidos.
        if (active) setEditHidratado(true);
      } catch (err) {
        console.error("[CargaFacturacion] no se pudo precargar la edición", err);
        if (!active) return;
        const e = err as { message?: string; response?: { status?: number; data?: { detail?: unknown } } };
        const status = e?.response?.status;
        setErrorEdicion(
          status === 404
            ? "No se encontró la prestación solicitada."
            : `No se pudo cargar la prestación${status ? ` (error ${status})` : ""}: ${
              (e?.response?.data?.detail ? detailMessage(e.response.data.detail) : e?.message) || "error desconocido"
            }.`,
        );
      } finally {
        if (active) setLoadingEdit(false);
      }
    })();
    return () => {
      active = false;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps -- los setters y refs vienen de otra parte del hook: son estables
  }, [isEdit, editId, loadPeriodo]);

  // Carga de la factura complementaria: valida que sea un complemento abierto y fija OS/período.
  useEffect(() => {
    if (!isComplemento || complementoId == null) return;
    let active = true;
    setLoadingComplemento(true);
    setComplementoError(null);
    (async () => {
      try {
        const d = await fetchFacturaDetalle(complementoId);
        if (!active) return;
        if (d.version <= 1) {
          setComplementoError("Esta factura no es un complemento — usá la carga normal.");
        } else if (d.estado !== "A") {
          setComplementoError("Esta factura complementaria ya fue cerrada.");
        } else {
          setComplementoMeta({
            cod_obra: d.cod_obra,
            periodo: d.periodo,
            periodo_label: d.periodo_label,
            version: d.version,
          });
        }
      } catch {
        if (active) setComplementoError("No se encontró la factura complementaria.");
      } finally {
        if (active) setLoadingComplemento(false);
      }
    })();
    return () => { active = false; };
  // eslint-disable-next-line react-hooks/exhaustive-deps -- los setters y refs vienen de otra parte del hook: son estables
  }, [isComplemento, complementoId]);

  // Sincronizar montos desde precio cuando cambia (modo automático)
  useEffect(() => {
    if (!precio) return;
    if (precio.por_presupuesto) {
      setTipoCalculo("M");
      // Honorarios/gastos los informa la OS a mano (por eso Manual), pero el coseguro sí tiene un valor propio del código — se precarga igual.
      setCoseguro(tipoPrestador === "ayudante" ? "0" : precio.coseguro ?? "0");
      return;
    }
    if (tipoCalculo === "A") {
      if (tipoPrestador === "ayudante") {
        setMontoAyudante(precio.ayudante ?? "0");
        // El coseguro es del acto, no de cada prestador: no aplica a la fila de ayudante.
        setCoseguro("0");
      } else {
        setHonorarios(precio.honorarios ?? "0");
        setGastos(gastosSugeridos(precio.gastos));
        setCoseguro(precio.coseguro ?? "0");
      }
    }
  }, [precio, tipoPrestador]); // eslint-disable-line react-hooks/exhaustive-deps

  // El máximo de ayudantes depende del código elegido — al cambiar de código las líneas ya cargadas dejan de tener sentido.
  useEffect(() => {
    if (loadingEdit || loadingReplicar) return;
    setAyudantes([]);
    setVia("T");
    setTipoCalculo("A");
    // El pediatra sólo aplica a parto/cesárea: si el código principal cambió, ya no vale (aunque el código nuevo también sea de parto/cesárea.
    setPediatra(null);
  }, [codNomenclador]); // eslint-disable-line react-hooks/exhaustive-deps

  // Prestación precargada (editar / replicar) con número: se busca su afiliado para tener el id, que es con lo que se elige.
  useEffect(() => {
    if (afiliadoId != null || !dni) return;
    let vigente = true;
    fetchAfiliado(dni)
      .then((a) => { if (vigente) setAfiliadoId(a.id); })
      .catch(() => { /* fuera del padrón: queda con el número y el nombre copiados */ });
    return () => { vigente = false; };
  // eslint-disable-next-line react-hooks/exhaustive-deps -- los setters y refs vienen de otra parte del hook: son estables
  }, [dni, afiliadoId]);

  /** Afiliado elegido, creado o editado en la sección Paciente (`null` = vaciado). */
  const handleAfiliadoChange = useCallback((a: AfiliadoRead | null) => {
    setAfiliadoId(a?.id ?? null);
    setDni(a?.dni ?? "");
    setNombrePaciente(a?.nombre ?? "");
    // Editado con el lápiz: el backend corrigió también sus prestaciones de facturas
    // abiertas — se avisa cuántas y se recarga la tabla para verlas ya corregidas.
    const corregidas = a?.prestaciones_actualizadas ?? 0;
    if (corregidas > 0) {
      notify(
        corregidas === 1
          ? "Se actualizó 1 prestación abierta de este paciente."
          : `Se actualizaron ${corregidas} prestaciones abiertas de este paciente.`,
        "success",
      );
      setRefreshKey((k) => k + 1);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps -- los setters y refs vienen de otra parte del hook: son estables
  }, [notify]);

  return {
    precio,
    precioLoading,
    precioError,
    autorizacionesExistentes,
    precioPediatra,
    precioPediatraLoading,
    handleAfiliadoChange,
  };
}

export type useCargaPreciosCtx = ReturnType<typeof useCargaPrecios>;
