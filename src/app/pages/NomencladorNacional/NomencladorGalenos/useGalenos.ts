import { useCallback, useEffect, useMemo, useState } from "react";
import { type EditForm, type ImportForm, type ModalKind } from "./galenos.types";
import { type GalenoOut, type GalenosImportarResult, type ObraSocialFamiliaItem, type ReplicaResultadoItem, type ReplicarGalenoFamiliaPayload } from "../nomenclador.types";
import { today } from "./galenos.helpers";
import { REPLICA_INICIAL, destinosReplica, type ReplicaState } from "@/app/pages/NomencladorNacional/components/ReplicarFamilia/replicaState";
import { useObrasSociales } from "../../ObrasSociales/useObrasSociales";
import { actualizarPrecioGaleno, actualizarUnidadesGaleno, deleteGaleno, getFamiliaObraSocial, getHistorialGaleno, importarGalenosDeObraSocial, listGalenos, replicarGalenoEnFamilia, updateGaleno } from "../nomenclador.api";
import { compararGalenos } from "../nomenclador.helpers";
import { extractDetail } from "@/app/pages/NomencladorNacional/NomencladorGalenos/utiles";

/** La lógica de NomencladorGalenos: estado, consultas y acciones. El texto es el del componente original. */
export function useGalenos() {
  const [modalKind, setModalKind] = useState<ModalKind>(null);
  const [toast, setToast] = useState<{
    type: "success" | "error";
    msg: string;
  } | null>(null);

  // ── Por-OS state ──────────────────────────────────────────────────────────
  const [selectedOsNro, setSelectedOsNro] = useState<number | null>(null);
  const [osGalenos, setOsGalenos] = useState<GalenoOut[]>([]);
  const [loadingOs, setLoadingOs] = useState(false);
  const [toggling, setToggling] = useState<number | null>(null);

  // ── Edit modal state ──────────────────────────────────────────────────────
  const [editTarget, setEditTarget] = useState<GalenoOut | null>(null);
  const [editForm, setEditForm] = useState<EditForm>({
    observacion: "",
    vigencia_unidades: today(),
    hon: "",
    ayu: "",
    gas: "",
    valor: "",
    vigencia_precio: today(),
  });
  const [savingObs, setSavingObs] = useState(false);
  const [savingUnidades, setSavingUnidades] = useState(false);
  const [savingPrecio, setSavingPrecio] = useState(false);
  const [confirmUnidades, setConfirmUnidades] = useState(false);
  const [editErrors, setEditErrors] = useState<Record<string, string>>({});
  // Replicar en los planes de la familia de la OS del galeno (mismo código y nivel).
  const [familiaEdit, setFamiliaEdit] = useState<ObraSocialFamiliaItem[]>([]);
  const [replica, setReplica] = useState<ReplicaState>(REPLICA_INICIAL);
  const [replicaResultado, setReplicaResultado] = useState<{
    accion: "valor" | "unidades";
    resultados: ReplicaResultadoItem[];
  } | null>(null);
  const [replicaError, setReplicaError] = useState<string | null>(null);

  // ── Import modal state ────────────────────────────────────────────────────
  const [importForm, setImportForm] = useState<ImportForm>({
    osOrigen: "",
    vigencia_desde: today(),
    alcance: "todos",
    convertir: false,
    actualizar: "valor_y_unidades",
  });
  const [importOsSearch, setImportOsSearch] = useState("");
  const [importOsOpen, setImportOsOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] =
    useState<GalenosImportarResult | null>(null);
  const [importErrors, setImportErrors] = useState<Record<string, string>>({});
  // Galenos vigentes de la OS origen (para el alcance nivelados / sin nivel)
  const [importOrigenGalenos, setImportOrigenGalenos] = useState<
    GalenoOut[] | null
  >(null);

  // ── Historial state ───────────────────────────────────────────────────────
  const [historialTarget, setHistorialTarget] = useState<{
    os: number;
    codigo: string;
    nombre: string;
    nivel: number | null;
  } | null>(null);
  const [historialRows, setHistorialRows] = useState<GalenoOut[]>([]);
  const [loadingHistorial, setLoadingHistorial] = useState(false);

  // ── Queries ───────────────────────────────────────────────────────────────
  const { data: osList = [] } = useObrasSociales();

  // ── Loaders ───────────────────────────────────────────────────────────────
  const loadOsGalenos = useCallback(async (osNro: number) => {
    setLoadingOs(true);
    try {
      const data = await listGalenos({ obra_social_nro: osNro });
      setOsGalenos(data.filter((g) => g.activo));
    } catch {
      setOsGalenos([]);
    } finally {
      setLoadingOs(false);
    }
  }, []);

  useEffect(() => {
    if (selectedOsNro) loadOsGalenos(selectedOsNro);
  }, [selectedOsNro, loadOsGalenos]);

  // ── Shared helpers ────────────────────────────────────────────────────────
  function showToast(type: "success" | "error", msg: string) {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 4500);
  }

  // Los galenos de la obra social elegida, en el orden del boletín.
  const osGalenosOrdenados = useMemo(
    () =>
      [...osGalenos].sort(
        (a, b) => compararGalenos(a, b) || (a.nivel ?? 0) - (b.nivel ?? 0),
      ),
    [osGalenos],
  );

  const selectedOsName = osList.find(
    (os) => os.nro_obra_social === selectedOsNro,
  )?.nombre;

  // ── Create actions ────────────────────────────────────────────────────────
  function openCreate() {
    setModalKind("create");
  }

  function handleCreated() {
    if (selectedOsNro) loadOsGalenos(selectedOsNro);
  }

  // ── Edit actions ──────────────────────────────────────────────────────────
  function openEdit(g: GalenoOut) {
    setEditTarget(g);
    setEditForm({
      observacion: g.observacion ?? "",
      vigencia_unidades: today(),
      hon: "",
      ayu: "",
      gas: "",
      valor: g.valor_unitario ?? "",
      vigencia_precio: today(),
    });
    setEditErrors({});
    setConfirmUnidades(false);
    setReplica(REPLICA_INICIAL);
    setReplicaResultado(null);
    setReplicaError(null);
    setFamiliaEdit([]);
    getFamiliaObraSocial(g.obra_social_nro)
      .then(setFamiliaEdit)
      .catch(() => setFamiliaEdit([]));
    setModalKind("edit");
  }

  const replicaActiva = replica.activo && replica.destinos.length > 0;

  /** Replica en la familia la acción recién guardada. true = hubo replicación (el modal queda abierto mostrando el resultado). */
  async function replicarGalenoSiCorresponde(
    accion: "valor" | "unidades",
    payload: Omit<
      ReplicarGalenoFamiliaPayload,
      "origen_obra_social_nro" | "destinos"
    >,
  ): Promise<boolean> {
    const destinos = destinosReplica(replica);
    if (!editTarget || destinos.length === 0) return false;
    setReplicaResultado(null);
    setReplicaError(null);
    try {
      const r = await replicarGalenoEnFamilia({
        ...payload,
        origen_obra_social_nro: editTarget.obra_social_nro,
        destinos,
      });
      setReplicaResultado({ accion, resultados: r.resultados });
    } catch (e) {
      setReplicaError(extractDetail(e));
    }
    return true;
  }

  async function handleActualizarPrecio() {
    if (!editTarget) return;
    const v = parseFloat(editForm.valor);
    const e: Record<string, string> = {};
    if (editForm.valor.trim() === "" || isNaN(v) || v < 0)
      e.valor = "Valor inválido";
    if (!editForm.vigencia_precio) e.vigencia_precio = "Requerido";
    setEditErrors((p) => ({ ...p, ...e }));
    if (Object.keys(e).length > 0) return;

    setSavingPrecio(true);
    try {
      await actualizarPrecioGaleno(editTarget.id, {
        nuevo_valor_unitario: v,
        vigencia_desde: editForm.vigencia_precio,
      });
      showToast("success", "Valor del galeno actualizado.");
      const replicado = await replicarGalenoSiCorresponde("valor", {
        operacion: "precio",
        codigo: editTarget.codigo,
        nivel: editTarget.nivel,
        nuevo_valor_unitario: v,
        vigencia_desde: editForm.vigencia_precio,
      });
      if (!replicado) setModalKind(null);
      if (selectedOsNro) loadOsGalenos(selectedOsNro);
    } catch (err) {
      showToast("error", extractDetail(err));
    } finally {
      setSavingPrecio(false);
    }
  }

  async function handleSaveObservacion() {
    if (!editTarget) return;
    setSavingObs(true);
    try {
      const updated = await updateGaleno(editTarget.id, {
        observacion: editForm.observacion.trim() || null,
      });
      setOsGalenos((prev) =>
        prev.map((g) => (g.id === updated.id ? updated : g)),
      );
      setEditTarget(updated);
      showToast("success", "Observación guardada.");
    } catch (e) {
      showToast("error", extractDetail(e));
    } finally {
      setSavingObs(false);
    }
  }

  function validateUnidades(): boolean {
    const e: Record<string, string> = {};
    if (!editForm.vigencia_unidades) e.vigencia_unidades = "Requerido";
    const someSet = [editForm.hon, editForm.ayu, editForm.gas].some(
      (v) => v.trim() !== "",
    );
    if (!someSet) e.unidades = "Ingresá al menos una unidad para actualizar";
    setEditErrors(e);
    return Object.keys(e).length === 0;
  }

  function handleActualizarUnidades() {
    if (!validateUnidades()) return;
    setConfirmUnidades(true);
  }

  async function doActualizarUnidades() {
    setConfirmUnidades(false);
    if (!editTarget) return;
    setSavingUnidades(true);

    const parseOpt = (s: string): number | undefined =>
      s.trim() === "" ? undefined : parseFloat(s);

    const h = parseOpt(editForm.hon);
    const a = parseOpt(editForm.ayu);
    const g = parseOpt(editForm.gas);

    try {
      const result = await actualizarUnidadesGaleno(editTarget.id, {
        vigencia_desde: editForm.vigencia_unidades,
        ...(h !== undefined && { unidades_honorarios: h }),
        ...(a !== undefined && { unidades_ayudante: a }),
        ...(g !== undefined && { unidades_gastos: g }),
      });
      setOsGalenos((prev) =>
        prev.map((x) => (x.id === result.galeno.id ? result.galeno : x)),
      );
      showToast(
        "success",
        `Unidades actualizadas. ${result.componentes_actualizados} componente(s) afectados.`,
      );
      const replicado = await replicarGalenoSiCorresponde("unidades", {
        operacion: "unidades",
        codigo: editTarget.codigo,
        nivel: editTarget.nivel,
        vigencia_desde: editForm.vigencia_unidades,
        ...(h !== undefined && { unidades_honorarios: h }),
        ...(a !== undefined && { unidades_ayudante: a }),
        ...(g !== undefined && { unidades_gastos: g }),
      });
      if (!replicado) setModalKind(null);
      if (selectedOsNro) loadOsGalenos(selectedOsNro);
    } catch (e) {
      showToast("error", extractDetail(e));
    } finally {
      setSavingUnidades(false);
    }
  }

  // ── Import actions ────────────────────────────────────────────────────────
  function openImport() {
    setImportForm({
      osOrigen: "",
      vigencia_desde: today(),
      alcance: "todos",
      convertir: false,
      actualizar: "valor_y_unidades",
    });
    setImportOsSearch("");
    setImportOsOpen(false);
    setImportResult(null);
    setImportErrors({});
    setImportOrigenGalenos(null);
    setModalKind("import");
  }

  async function loadImportOrigenGalenos(osNro: number) {
    setImportOrigenGalenos(null);
    try {
      const data = await listGalenos({ obra_social_nro: osNro });
      setImportOrigenGalenos(
        data.filter((g) => g.activo && g.vigencia_hasta == null),
      );
    } catch {
      setImportOrigenGalenos([]);
    }
  }

  async function handleImport(forceConvertir?: boolean) {
    const e: Record<string, string> = {};
    if (importForm.osOrigen === "") e.osOrigen = "Requerido";
    if (!importForm.vigencia_desde) e.vigencia_desde = "Requerido";
    if (
      importForm.osOrigen !== "" &&
      Number(importForm.osOrigen) === selectedOsNro
    )
      e.osOrigen = "El origen no puede ser igual al destino";

    // Con alcance parcial, los códigos salen de los galenos del origen ya cargados
    let codigos: string[] | undefined;
    if (importForm.osOrigen !== "" && importForm.alcance !== "todos") {
      if (importOrigenGalenos == null) {
        e.alcance = "Aguardá a que carguen los galenos del origen";
      } else {
        const filtrados = importOrigenGalenos.filter((g) =>
          importForm.alcance === "nivelados"
            ? g.nivel != null
            : g.nivel == null,
        );
        codigos = [...new Set(filtrados.map((g) => g.codigo))];
        if (codigos.length === 0) {
          e.alcance =
            importForm.alcance === "nivelados"
              ? "El origen no tiene galenos nivelados"
              : "El origen no tiene galenos sin nivel";
        }
      }
    }

    setImportErrors(e);
    if (Object.keys(e).length > 0) return;

    const convertir = forceConvertir ?? importForm.convertir;
    if (forceConvertir) setImportForm((p) => ({ ...p, convertir: true }));

    setImporting(true);
    setImportResult(null);
    try {
      const result = await importarGalenosDeObraSocial({
        obra_social_nro_origen: Number(importForm.osOrigen),
        obra_social_nro_destino: selectedOsNro!,
        vigencia_desde: importForm.vigencia_desde,
        ...(codigos ? { codigos } : {}),
        convertir_a_nivelado: convertir,
        solo_valor: importForm.actualizar === "solo_valor",
      });
      setImportResult(result);
      if (selectedOsNro) loadOsGalenos(selectedOsNro);
    } catch (e) {
      showToast("error", extractDetail(e));
    } finally {
      setImporting(false);
    }
  }

  // ── Historial actions ─────────────────────────────────────────────────────
  async function openHistorial(g: GalenoOut) {
    setHistorialTarget({
      os: g.obra_social_nro,
      codigo: g.codigo,
      nombre: g.nombre,
      nivel: g.nivel,
    });
    setHistorialRows([]);
    setLoadingHistorial(true);
    setModalKind("historial");
    try {
      const rows = await getHistorialGaleno(
        g.obra_social_nro,
        g.codigo,
        g.nivel ?? undefined,
      );
      setHistorialRows(rows);
    } catch {
      showToast("error", "No se pudo cargar el historial.");
    } finally {
      setLoadingHistorial(false);
    }
  }

  // ── Toggle (delete) ───────────────────────────────────────────────────────
  async function handleToggleOs(g: GalenoOut) {
    setToggling(g.id);
    try {
      await deleteGaleno(g.id);
      setOsGalenos((prev) => prev.filter((x) => x.id !== g.id));
      showToast("success", `"${g.nombre}" desactivado.`);
    } catch (e) {
      const err = e as {
        response?: { status?: number; data?: { detail?: string } };
      };
      if (err?.response?.status === 409) {
        showToast(
          "error",
          "No se puede desactivar: hay un valor activo que usa este galeno.",
        );
      } else {
        showToast("error", extractDetail(e));
      }
    } finally {
      setToggling(null);
    }
  }

  return {
    modalKind,
    setModalKind,
    toast,
    setToast,
    selectedOsNro,
    setSelectedOsNro,
    osGalenos,
    setOsGalenos,
    loadingOs,
    setLoadingOs,
    toggling,
    setToggling,
    editTarget,
    setEditTarget,
    editForm,
    setEditForm,
    savingObs,
    setSavingObs,
    savingUnidades,
    setSavingUnidades,
    savingPrecio,
    setSavingPrecio,
    confirmUnidades,
    setConfirmUnidades,
    editErrors,
    setEditErrors,
    familiaEdit,
    setFamiliaEdit,
    replica,
    setReplica,
    replicaResultado,
    setReplicaResultado,
    replicaError,
    setReplicaError,
    importForm,
    setImportForm,
    importOsSearch,
    setImportOsSearch,
    importOsOpen,
    setImportOsOpen,
    importing,
    setImporting,
    importResult,
    setImportResult,
    importErrors,
    setImportErrors,
    importOrigenGalenos,
    setImportOrigenGalenos,
    historialTarget,
    setHistorialTarget,
    historialRows,
    setHistorialRows,
    loadingHistorial,
    setLoadingHistorial,
    osList,
    loadOsGalenos,
    showToast,
    osGalenosOrdenados,
    selectedOsName,
    openCreate,
    handleCreated,
    openEdit,
    replicaActiva,
    replicarGalenoSiCorresponde,
    handleActualizarPrecio,
    handleSaveObservacion,
    validateUnidades,
    handleActualizarUnidades,
    doActualizarUnidades,
    openImport,
    loadImportOrigenGalenos,
    handleImport,
    openHistorial,
    handleToggleOs,
  };
}

export type GalenosCtx = ReturnType<typeof useGalenos>;
