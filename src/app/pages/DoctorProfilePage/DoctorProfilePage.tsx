// app/pages/DoctorProfile/DoctorProfilePage.tsx
"use client";

import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

import Card from "../../components/atoms/Card/Card";
import Button from "../../components/atoms/Button/Button";
import styles from "./DoctorProfilePage.module.scss";

import RequirePermission from "../../auth/RequirePermission";
import BackButton from "../../components/atoms/BackButton/BackButton";
import type {
  DoctorProfile,
  DoctorDocument,
  DoctorEspecialidad,
  Role,
  Permission,
  Option,
  Especialidad,
} from "./api";

import {
  getMedicoDetail,
  getMedicoDocumentos,
  getMedicoEspecialidades,
  getListEspecialidades,
  addMedicoEspecialidad,
  editMedicoEspecialidad,
  removeMedicoEspecialidad,
  uploadDocumento,
  listRoles,
  listPermissions,
  getUserRoles,
  addUserRole,
  delUserRole,
  getOverrides,
  setOverride,
  getEffective,
  updateMedico,
  UPDATE_WHITELIST,
  setMedicoExiste,
  deleteMedico,
  getDocumentoLabels,
  addMedicoDocumento,
  // ⬇️ nuevos helpers
  deleteMedicoDocumento,
  setMedicoAttach,
  clearMedicoAttach,
} from "./api";

import { Modal, Toggle, Notification } from "rsuite";
import "rsuite/Modal/styles/index.css";
import "rsuite/Toggle/styles/index.css";
import { Animation } from "rsuite";
import ActionModal from "../../components/molecules/ActionModal/ActionModal";
import { useNotify } from "../../hooks/useNotify";

/* ===================== helpers labels ===================== */
// Mapa de claves attach_* → etiqueta legible
const ATTACH_PRETTY: Record<string, string> = {
  attach_titulo: "Título",
  attach_matricula_nac: "Matrícula nacional",
  attach_matricula_prov: "Matrícula provincial",
  attach_resolucion: "Resolución",
  attach_habilitacion_municipal: "Habilitación municipal",
  attach_cuit: "CUIT",
  attach_condicion_impositiva: "Condición impositiva",
  attach_anssal: "ANSSAL",
  attach_malapraxis: "Malapraxis",
  attach_cbu: "CBU",
  attach_dni: "Documento",
};

const ATTACH_KEYS = Object.keys(ATTACH_PRETTY);

// quita prefijo attach_ y normaliza
const stripAttach = (k: string) => k.replace(/^attach_/, "").toLowerCase();

// devuelve un “bonito” para una key attach_* o un label “libre”
function prettyFromAnyLabel(label: string) {
  if (label.startsWith("attach_")) return ATTACH_PRETTY[label] ?? label;
  // para labels tipo "titulo" -> "Título", "constancia_especial" -> "Constancia especial"
  const words = label.replace(/_/g, " ").toLowerCase().split(" ");
  const cap = words
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
    .join(" ");
  // casos conocidos
  return cap.replace(/\bDni\b/, "Documento").replace(/\bCuit\b/, "CUIT");
}

// “formatea” opciones: value=attach_* u "otro", label visible bonito
const formatOption = (opt: string) =>
  opt === "otro" ? "Otro" : ATTACH_PRETTY[opt] ?? opt;

// normaliza para comparar (quita attach_ y pasa a lower)
const normalizeForCompare = (label: string) => stripAttach(label);

/* ========================================================== */

const WL = new Set<string>(UPDATE_WHITELIST as unknown as string[]);

const DATE_FIELDS = new Set([
  "fecha_nac",
  "fecha_recibido",
  "fecha_matricula",
  "fecha_resolucion",
  "vencimiento_anssal",
  "vencimiento_malapraxis",
  "vencimiento_cobertura",
]);

const INT_FIELDS = new Set([
  "anssal",
  "cobertura",
  "nro_socio",
  "matricula_prov",
  "matricula_nac",
]);

const isBlankish = (v: any) =>
  v === undefined || v === null || (typeof v === "string" && v.trim() === "");
const isDashish = (v: any) => typeof v === "string" && /^-+$/.test(v.trim());

const toYmd2 = (v: any): string | null => {
  if (!v) return null;
  if (v instanceof Date && !isNaN(v as any)) {
    const d = v as Date;
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${d.getFullYear()}-${mm}-${dd}`;
  }
  const s = String(v).trim();
  if (!s) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const m = s.match(/^(\d{2})-(\d{2})-(\d{4})$/);
  if (m) return `${m[3]}-${m[2]}-${m[1]}`;
  return s;
};

export function normalizePatch(input: Record<string, any>) {
  const out: Record<string, any> = {};
  for (const [k, raw] of Object.entries(input || {})) {
    if (!WL.has(k)) continue;
    if (isBlankish(raw) || isDashish(raw)) {
      out[k] = null;
      continue;
    }
    if (DATE_FIELDS.has(k)) {
      out[k] = toYmd2(raw);
      continue;
    }
    if (INT_FIELDS.has(k)) {
      const s = String(raw).replace(/\./g, "").replace(/,/g, "").trim();
      out[k] = /^\d+$/.test(s) ? Number(s) : null;
      continue;
    }
    out[k] = raw;
  }
  return out;
}

function toYmd(d?: Date | null): string | null {
  if (!d) return null;
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

const fmt = (v: any) =>
  v === undefined || v === null || v === "" ? "—" : String(v);
const fmtDate = (s?: string | null) =>
  s ? new Date(s).toLocaleDateString("es-AR") : "—";

type TabKey =
  | "datos"
  | "documentos"
  | "conceptos"
  | "especialidades"
  | "permisos";

const DEFAULT_LABELS = [...ATTACH_KEYS, "otro"];

const DoctorProfilePage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const medicoId = id!;
  const nav = useNavigate();
  const notify = useNotify();

  const [tab, setTab] = useState<TabKey>("datos");

  // perfil
  const [data, setData] = useState<DoctorProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Edición
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState<Partial<DoctorProfile>>({});

  // rbac
  const [rolesAll, setRolesAll] = useState<Role[]>([]);
  const [userRoles, setUserRoles] = useState<string[]>([]);
  const [permList, setPermList] = useState<Permission[]>([]);
  const [overrides, setOverrides] = useState<Record<string, boolean>>({});
  const [effective, setEffective] = useState<string[]>([]);
  const [rbacLoading, setRbacLoading] = useState(false);

  // especialidades
  const [especs, setEspecs] = useState<DoctorEspecialidad[]>([]);
  const [espLoading, setEspLoading] = useState(false);
  const [especErr, setEspecErr] = useState<string | null>(null);
  const [rmEspBusy, setRmEspBusy] = useState<number | null>(null);

  const [assocEspOpen, setAssocEspOpen] = useState(false);
  const [assocEspId, setAssocEspId] = useState<string>("");
  const [assocEspBusy, setAssocEspBusy] = useState(false);
  const [assocEspResol, setAssocEspResol] = useState("");
  const [assocEspDate, setAssocEspDate] = useState<Date | null>(null);
  const [assocEspFile, setAssocEspFile] = useState<File | null>(null);

  const [delEspOpen, setDelEspOpen] = useState(false);
  const [espToDelete, setEspToDelete] = useState<DoctorEspecialidad | null>(
    null
  );
  const [delEspBusy, setDelEspBusy] = useState(false);

  // const [editEspOpen, setEditEspOpen] = useState(false);
  // const [editEspId, setEditEspId] = useState<number | null>(null);
  // const [editEspResol, setEditEspResol] = useState("");
  // const [editEspDate, setEditEspDate] = useState<Date | null>(null);
  // const [editEspFile, setEditEspFile] = useState<File | null>(null);
  // const [editEspBusy, setEditEspBusy] = useState(false);
  const [espOptions, setEspOptions] = useState<Option[]>([]);

  // documentos
  const [docs, setDocs] = useState<DoctorDocument[]>([]);
  const [docsLoading, setDocsLoading] = useState(false);

  // estado socio + eliminar socio
  const [existe, setExiste] = useState<"S" | "N">("N");
  const [toggleBusy, setToggleBusy] = useState(false);
  const [delOpen, setDelOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // agregar doc
  const [docOpen, setDocOpen] = useState(false);
  const [docLabel, setDocLabel] = useState<string>("attach_titulo"); // value attach_* u "otro"
  const [docCustom, setDocCustom] = useState<string>("");
  const [docFile, setDocFile] = useState<File | null>(null);
  const [docBusy, setDocBusy] = useState(false);
  const [labelOptions, setLabelOptions] = useState<string[]>(DEFAULT_LABELS);

  // reemplazo si ya existe ese tipo attach_*
  const [replaceOpen, setReplaceOpen] = useState(false);
  const [replacePretty, setReplacePretty] = useState<string>("");
  const [pendingUpload, setPendingUpload] = useState<{
    attachKey: string | null; // ej attach_titulo, o null si "otro"
    labelNormalized: string; // ej "titulo"
    file: File;
  } | null>(null);

  // eliminar doc individual
  const [delDocOpen, setDelDocOpen] = useState(false);
  const [docToDelete, setDocToDelete] = useState<DoctorDocument | null>(null);
  const [delDocBusy, setDelDocBusy] = useState(false);

  async function confirmDeleteEsp() {
    if (!espToDelete || !id) return;
    try {
      setDelEspBusy(true);
      setRmEspBusy(espToDelete.id); // opcional: para reflejar "Quitando…" en la fila
      await removeMedicoEspecialidad(id, espToDelete.id);
      const rr = await getMedicoEspecialidades(medicoId);
      setEspecs(rr);
      setDelEspOpen(false);
      setEspToDelete(null);
    } catch (e: any) {
      alert(e?.message || "No se pudo quitar la especialidad.");
    } finally {
      setDelEspBusy(false);
      setRmEspBusy(null);
    }
  }

  function setField<K extends keyof DoctorProfile>(
    key: K,
    val: DoctorProfile[K]
  ) {
    setDraft((d) => ({ ...d, [key]: val }));
  }

  const RText = (key: keyof DoctorProfile, placeholder = "") => (
    <input
      className={styles.input}
      value={(draft[key] as any) ?? ""}
      onChange={(e) => setField(key, e.target.value as any)}
      placeholder={placeholder}
    />
  );

  const RNumber = (key: keyof DoctorProfile) => (
    <input
      className={styles.input}
      value={(draft[key] as any) ?? ""}
      onChange={(e) =>
        setField(
          key,
          e.target.value === "" ? ("" as any) : (Number(e.target.value) as any)
        )
      }
      inputMode="numeric"
    />
  );

  const RSexo = (key: keyof DoctorProfile = "sexo") => (
    <select
      className={styles.select}
      value={(draft[key] as any) ?? ""}
      onChange={(e) => setField(key, e.target.value as any)}
    >
      <option value="">—</option>
      <option value="M">Masculino</option>
      <option value="F">Femenino</option>
    </select>
  );

  const RCondicion_impositiva = (
    key: keyof DoctorProfile = "condicion_impositiva"
  ) => (
    <select
      className={styles.select}
      value={(draft[key] as any) ?? ""}
      onChange={(e) => setField(key, e.target.value as any)}
    >
      <option value="">—</option>
      <option value="Monotributista">Monotributista</option>
      <option value="Responsable Inscripto">Responsable Inscripto</option>
      <option value="Exento">Exento</option>
      <option value="Rentas">Rentas</option>
    </select>
  );

  const RDate = (key: keyof DoctorProfile) => {
    const curr = draft[key] as string | null | undefined;
    const asDate = curr ? new Date(curr) : null;
    return (
      <DatePicker
        selected={asDate}
        onChange={(d) => setField(key, toYmd(d) as any)}
        className={styles.dateInput}
        dateFormat="dd-MM-yyyy"
        placeholderText="dd-MM-aaaa"
        closeOnScroll
        showPopperArrow={false}
      />
    );
  };

  // Load perfil
  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      try {
        const d = await getMedicoDetail(medicoId);
        if (!alive) return;
        setData(d);
        if (d?.existe) setExiste(d.existe.toUpperCase() === "S" ? "S" : "N");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [medicoId]);

  // Permisos tab
  useEffect(() => {
    if (tab !== "permisos") return;
    let alive = true;
    (async () => {
      setRbacLoading(true);
      try {
        const [allRoles, userRs, permsAll, ovs, eff] = await Promise.all([
          listRoles(),
          getUserRoles(medicoId),
          listPermissions(),
          getOverrides(medicoId),
          getEffective(medicoId),
        ]);
        if (!alive) return;
        setRolesAll(allRoles);
        setUserRoles(userRs.map((r) => r.name));
        setPermList(permsAll);
        const map: Record<string, boolean> = {};
        ovs.forEach((o) => (map[o.code] = o.allow));
        setOverrides(map);
        setEffective(eff.permissions);
      } finally {
        if (alive) setRbacLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [tab, medicoId]);

  // Especialidades tab
  useEffect(() => {
    if (tab !== "especialidades") return;
    let alive = true;
    (async () => {
      setEspLoading(true);
      try {
        const r = await getMedicoEspecialidades(medicoId);
        if (!alive) return;
        setEspecs(r);
      } finally {
        if (alive) setEspLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [tab, medicoId]);

  // Documentos tab
  useEffect(() => {
    if (tab !== "documentos") return;
    let alive = true;
    (async () => {
      setDocsLoading(true);
      try {
        const r = await getMedicoDocumentos(medicoId);
        if (!alive) return;
        setDocs(r);
      } finally {
        if (alive) setDocsLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [tab, medicoId]);

  // Catálogo de especialidades
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const list = await getListEspecialidades();
        if (!alive) return;
        const opts = (list || []).map((e: Especialidad) => ({
          id: String(e.id_colegio_espe ?? e.id),
          label: e.nombre || `ID ${e.id}`,
        }));
        setEspOptions(opts);
      } catch (err) {
        setEspOptions([]);
        console.error("No se pudo cargar especialidades:", err);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  // Catálogo de labels de documentos
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const labels = await getDocumentoLabels().catch(() => DEFAULT_LABELS);
        if (!alive) return;
        const final = labels?.length ? labels : DEFAULT_LABELS;
        // garantizamos que sean solo attach_* conocidos + "otro"
        const cleaned = final.filter(
          (k) => k === "otro" || ATTACH_KEYS.includes(k)
        );
        setLabelOptions(cleaned.length ? cleaned : DEFAULT_LABELS);
        setDocLabel((cleaned[0] as string) || "attach_titulo");
      } catch {
        setLabelOptions(DEFAULT_LABELS);
        setDocLabel("attach_titulo");
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  async function reloadDocs() {
    setDocsLoading(true);
    try {
      const r = await getMedicoDocumentos(medicoId);
      setDocs(r);
    } finally {
      setDocsLoading(false);
    }
  }

  // ====== flujo subir (y eventualmente reemplazar) documento ======
  const tryUploadDocumento = async () => {
    if (!docFile) return;

    const attachKey = docLabel !== "otro" ? docLabel : null; // ej attach_titulo o null
    const labelNormalized =
      docLabel === "otro"
        ? docCustom.trim().toLowerCase().replace(/\s+/g, "_")
        : stripAttach(docLabel); // guardamos sin attach_

    // si es un attach_* y ya existe un doc con ese “tipo”, pedimos confirmación
    if (attachKey) {
      const exists = docs.find(
        (d) => normalizeForCompare(d.label) === labelNormalized
      );
      if (exists) {
        setPendingUpload({ attachKey, labelNormalized, file: docFile });
        setReplacePretty(ATTACH_PRETTY[attachKey] || attachKey);
        setReplaceOpen(true);
        return; // frenamos hasta confirmación
      }
    }

    await performUploadAndMap({
      attachKey,
      labelNormalized,
      file: docFile,
    });
  };

  const performUploadAndMap = async (payload: {
    attachKey: string | null;
    labelNormalized: string;
    file: File;
  }) => {
    const { attachKey, labelNormalized, file } = payload;
    setDocBusy(true);
    try {
      // 1) subir y crear registro documento con label NORMALIZADO (sin attach_)
      const created = await addMedicoDocumento(medicoId, file, labelNormalized); // -> DoctorDocument

      // 2) si corresponde a un attach_* mapear ese doc al campo unitario
      if (attachKey) {
        await setMedicoAttach(medicoId, attachKey, created.id);
      }

      // 3) refrescar listado
      await reloadDocs();

      // limpiar modal
      setDocOpen(false);
      setDocFile(null);
      setDocCustom("");
    } finally {
      setDocBusy(false);
    }
  };

  const handleConfirmReplace = async () => {
    if (!pendingUpload) return;
    try {
      // borrar el existente de ese tipo (si lo encontramos de nuevo)
      const existing = docs.find(
        (d) => normalizeForCompare(d.label) === pendingUpload.labelNormalized
      );
      if (existing) {
        await deleteMedicoDocumento(medicoId, existing.id);
      }
      // subir nuevo y mapear
      await performUploadAndMap(pendingUpload);
    } catch (e: any) {
      alert(e?.message || "No se pudo reemplazar el documento.");
    } finally {
      setPendingUpload(null);
      setReplaceOpen(false);
    }
  };

  // ====== eliminar doc individual ======
  const askDeleteDoc = (doc: DoctorDocument) => {
    setDocToDelete(doc);
    setDelDocOpen(true);
  };

  const confirmDeleteDoc = async () => {
    if (!docToDelete) return;
    try {
      setDelDocBusy(true);
      // si el doc corresponde a un attach conocido, limpiar el campo
      const normalized = normalizeForCompare(docToDelete.label); // ej "titulo"
      const attachKey = ATTACH_KEYS.find((k) => stripAttach(k) === normalized); // ej "attach_titulo"
      if (attachKey) {
        await clearMedicoAttach(medicoId, attachKey);
      }
      await deleteMedicoDocumento(medicoId, docToDelete.id);
      await reloadDocs();
      setDelDocOpen(false);
      setDocToDelete(null);
    } catch (e: any) {
      alert(e?.message || "No se pudo eliminar el documento.");
    } finally {
      setDelDocBusy(false);
    }
  };

  function AnimatedModal({
    open,
    onClose,
    size = "sm",
    title,
    children,
  }: {
    open: boolean;
    onClose: () => void;
    size?: "xs" | "sm" | "md" | "lg" | "full";
    title: React.ReactNode;
    children: React.ReactNode;
  }) {
    // Montado real del Modal (para no desmontarlo hasta que termine la animación)
    const [mounted, setMounted] = React.useState(open);
    const [show, setShow] = React.useState(open);

    // cuando cambia `open`, disparo entrada/salida
    React.useEffect(() => {
      if (open) {
        setMounted(true);
        // dejar un microtick para que Transition capte el cambio a `in=true`
        requestAnimationFrame(() => setShow(true));
      } else {
        setShow(false);
      }
    }, [open]);

    return (
      <Modal
        open={mounted}
        onClose={() => setShow(false)}
        size={size}
        className={styles.animatedModal}
        // callbacks de cierre si clicás el backdrop o la X
      >
        <Modal.Header>
          <Modal.Title>{title}</Modal.Title>
        </Modal.Header>

        {/* Transición personalizada */}
        <Animation.Transition
          in={show}
          timeout={220}
          enteringClassName="slideUp-entering"
          enteredClassName="slideUp-entered"
          exitingClassName="slideUp-exiting"
          exitedClassName="slideUp-exited"
          onExited={() => {
            setMounted(false);
            onClose(); // sincronizo con el estado padre
          }}
        >
          {/* envoltorio para aplicar transform/opacity */}
          <div className="slideUp-sheet">
            <Modal.Body>{children}</Modal.Body>
            <Modal.Footer />
          </div>
        </Animation.Transition>
      </Modal>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.content}>
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
        >
          <div className={styles.topbar}>
            <BackButton />
            <div />
          </div>

          {loading ? (
            <Card className={styles.loadingCard}>
              <div className={styles.loader} aria-label="Cargando perfil…" />
              <p>Cargando perfil…</p>
            </Card>
          ) : !data ? (
            <Card className={styles.errorCard}>
              <p>No se encontró el profesional solicitado.</p>
            </Card>
          ) : (
            <div className={styles.profileLayout}>
              <div className={styles.rightCol}>
                <Card className={styles.headerCard}>
                  <div className={styles.profileHeader}>
                    <div className={styles.avatarSmall} aria-label={data.name}>
                      {data.name
                        ?.split(" ")
                        .map((w) => w[0])
                        .slice(0, 2)
                        .join("")}
                    </div>

                    <div className={styles.headerMain}>
                      <h2 className={styles.name}>{data.name}</h2>
                      <div className={styles.roleRow}>
                        <span className={styles.location}>N° socio:</span>
                        <span className={styles.role}>
                          {data.nro_socio || "—"}
                        </span>
                        <span className={styles.dot}>•</span>
                        <span className={styles.location}>
                          Mat. provincial:
                        </span>
                        <span className={styles.role}>
                          {data.matricula_prov}
                        </span>
                      </div>
                    </div>

                    {/* Toggle + eliminar socio */}
                    <div className={styles.headerActions}>
                      <div
                        className={styles.toggleWrap}
                        title="Habilitar / Inhabilitar socio"
                      >
                        <span
                          className={styles.muted}
                          style={{ marginRight: 8 }}
                        >
                          {existe === "S" ? "Habilitado" : "Inhabilitado"}
                        </span>
                        <Toggle
                          checked={existe === "S"}
                          loading={toggleBusy}
                          onChange={async (checked: boolean) => {
                            try {
                              setToggleBusy(true);
                              const next = checked ? "S" : "N";
                              await setMedicoExiste(medicoId, next);
                              setExiste(next);
                              setData((d) =>
                                d ? ({ ...d, existe: next } as any) : d
                              );
                            } catch (e: any) {
                              alert(
                                e?.message || "No se pudo actualizar el estado."
                              );
                            } finally {
                              setToggleBusy(false);
                            }
                          }}
                        />
                      </div>

                      <Button
                        variant="danger"
                        onClick={() => setDelOpen(true)}
                        title="Eliminar socio"
                        style={{ marginLeft: 12 }}
                      >
                        <Trash2 size={16} />
                        &nbsp;Eliminar socio
                      </Button>
                    </div>
                  </div>

                  {/* Tabs */}
                  <div className={styles.tabs}>
                    {(
                      ["datos", "documentos", "especialidades"] as TabKey[]
                    ).map((k) => (
                      <button
                        key={k}
                        className={`${styles.tab} ${
                          tab === k ? styles.tabActive : ""
                        }`}
                        onClick={() => setTab(k)}
                      >
                        {k[0].toUpperCase() + k.slice(1)}
                        {tab === k && (
                          <motion.span
                            layoutId="tab-underline"
                            className={styles.tabUnderline}
                          />
                        )}
                      </button>
                    ))}
                    <RequirePermission scope="rbac:gestionar">
                      <button
                        className={`${styles.tab} ${
                          tab === "permisos" ? styles.tabActive : ""
                        }`}
                        onClick={() => setTab("permisos")}
                      >
                        Permisos
                        {tab === "permisos" && (
                          <motion.span
                            layoutId="tab-underline"
                            className={styles.tabUnderline}
                          />
                        )}
                      </button>
                    </RequirePermission>
                  </div>

                  <AnimatePresence mode="wait">
                    {/* === Datos === */}
                    {tab === "datos" && data && (
                      <motion.div
                        key="tab-datos"
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 8 }}
                        className={styles.tabBody}
                      >
                        <button
                          type="button"
                          className={styles.editPencil}
                          aria-label={isEditing ? "Cancelar edición" : "Editar"}
                          title={isEditing ? "Cancelar edición" : "Editar"}
                          onClick={() => {
                            if (!isEditing) {
                              setDraft({ ...data });
                              setIsEditing(true);
                            } else {
                              setIsEditing(false);
                              setDraft({});
                            }
                          }}
                        >
                          <Pencil size={16} />
                        </button>

                        <h5 className={styles.section}>Datos personales</h5>
                        <div className={styles.infoGrid}>
                          <div>
                            <span className={styles.label}>
                              Nombre (registro)
                            </span>
                            {isEditing ? (
                              RText("name")
                            ) : (
                              <span>{fmt(data.name)}</span>
                            )}
                          </div>
                          <div>
                            <span className={styles.label}>Nombre</span>
                            {isEditing ? (
                              RText("nombre_")
                            ) : (
                              <span>{fmt(data.nombre_)}</span>
                            )}
                          </div>
                          <div>
                            <span className={styles.label}>Apellido</span>
                            {isEditing ? (
                              RText("apellido")
                            ) : (
                              <span>{fmt(data.apellido)}</span>
                            )}
                          </div>
                          <div>
                            <span className={styles.label}>Sexo</span>
                            {isEditing ? (
                              RSexo("sexo")
                            ) : (
                              <span>{fmt(data.sexo)}</span>
                            )}
                          </div>
                          <div>
                            <span className={styles.label}>Documento</span>
                            {isEditing ? (
                              RText("documento")
                            ) : (
                              <span>{fmt(data.documento)}</span>
                            )}
                          </div>
                          <div>
                            <span className={styles.label}>CUIT</span>
                            {isEditing ? (
                              RText("cuit")
                            ) : (
                              <span>{fmt(data.cuit)}</span>
                            )}
                          </div>
                          <div>
                            <span className={styles.label}>
                              Fecha de nacimiento
                            </span>
                            {isEditing ? (
                              RDate("fecha_nac")
                            ) : (
                              <span>{fmtDate(data.fecha_nac)}</span>
                            )}
                          </div>
                          <div>
                            <span className={styles.label}>Estado</span>
                            <span>
                              {data.existe
                                ? data.existe.toUpperCase() === "S"
                                  ? "Activo"
                                  : "Inactivo"
                                : "—"}
                            </span>
                          </div>

                          <div>
                            <span className={styles.label}>Provincia</span>
                            {isEditing ? (
                              RText("provincia")
                            ) : (
                              <span>{fmt(data.provincia)}</span>
                            )}
                          </div>
                          <div>
                            <span className={styles.label}>Localidad</span>
                            {isEditing ? (
                              RText("localidad")
                            ) : (
                              <span>{fmt(data.localidad)}</span>
                            )}
                          </div>
                          <div>
                            <span className={styles.label}>Código postal</span>
                            {isEditing ? (
                              RText("codigo_postal")
                            ) : (
                              <span>{fmt(data.codigo_postal)}</span>
                            )}
                          </div>

                          <div>
                            <span className={styles.label}>
                              Domicilio particular
                            </span>
                            {isEditing ? (
                              RText("domicilio_particular")
                            ) : (
                              <span>{fmt(data.domicilio_particular)}</span>
                            )}
                          </div>
                          <div>
                            <span className={styles.label}>
                              Tel. particular
                            </span>
                            {isEditing ? (
                              RText("tele_particular")
                            ) : (
                              <span>{fmt(data.tele_particular)}</span>
                            )}
                          </div>
                          <div>
                            <span className={styles.label}>
                              Celular particular
                            </span>
                            {isEditing ? (
                              RText("celular_particular")
                            ) : (
                              <span>{fmt(data.celular_particular)}</span>
                            )}
                          </div>

                          <div>
                            <span className={styles.label}>
                              E-mail particular
                            </span>
                            {isEditing ? (
                              RText("mail_particular")
                            ) : (
                              <a
                                className={styles.link}
                                href={
                                  data.mail_particular
                                    ? `mailto:${data.mail_particular}`
                                    : undefined
                                }
                              >
                                {fmt(data.mail_particular)}
                              </a>
                            )}
                          </div>
                        </div>

                        {/* Profesionales */}
                        <h5
                          className={styles.section}
                          style={{ marginTop: 24 }}
                        >
                          Datos profesionales
                        </h5>
                        <div className={styles.infoGrid}>
                          <div>
                            <span className={styles.label}>Nº socio</span>
                            {isEditing ? (
                              RText("nro_socio")
                            ) : (
                              <span>{fmt(data.nro_socio)}</span>
                            )}
                          </div>
                          <div>
                            <span className={styles.label}>Categoría</span>
                            {isEditing ? (
                              RText("categoria")
                            ) : (
                              <span>{fmt(data.categoria)}</span>
                            )}
                          </div>
                          <div>
                            <span className={styles.label}>Título</span>
                            {isEditing ? (
                              RText("titulo")
                            ) : (
                              <span>{fmt(data.titulo)}</span>
                            )}
                          </div>
                          <div>
                            <span className={styles.label}>
                              Matrícula prov.
                            </span>
                            {isEditing ? (
                              RText("matricula_prov")
                            ) : (
                              <span>{fmt(data.matricula_prov)}</span>
                            )}
                          </div>
                          <div>
                            <span className={styles.label}>Matrícula nac.</span>
                            {isEditing ? (
                              RText("matricula_nac")
                            ) : (
                              <span>{fmt(data.matricula_nac)}</span>
                            )}
                          </div>
                          <div>
                            <span className={styles.label}>Fecha recibido</span>
                            {isEditing ? (
                              RText("fecha_recibido")
                            ) : (
                              <span>{fmt(data.fecha_recibido)}</span>
                            )}
                          </div>
                          <div>
                            <span className={styles.label}>
                              Fecha matrícula
                            </span>
                            {isEditing ? (
                              RText("fecha_matricula")
                            ) : (
                              <span>{fmt(data.fecha_matricula)}</span>
                            )}
                          </div>
                          <div>
                            <span className={styles.label}>
                              Domicilio de consulta
                            </span>
                          </div>
                          <div>
                            {isEditing ? (
                              RText("domicilio_consulta")
                            ) : (
                              <span>{fmt(data.domicilio_consulta)}</span>
                            )}
                          </div>
                          <div>
                            <span className={styles.label}>Tel. consulta</span>
                            {isEditing ? (
                              RText("telefono_consulta")
                            ) : (
                              <span>{fmt(data.telefono_consulta)}</span>
                            )}
                          </div>
                        </div>

                        {/* Impositivos */}
                        <h5
                          className={styles.section}
                          style={{ marginTop: 24 }}
                        >
                          Datos impositivos
                        </h5>
                        <div className={styles.infoGrid}>
                          <div>
                            <span className={styles.label}>
                              Condición impositiva
                            </span>
                            {isEditing ? (
                              RCondicion_impositiva("condicion_impositiva")
                            ) : (
                              <span>{fmt(data.condicion_impositiva)}</span>
                            )}
                          </div>
                          <div>
                            <span className={styles.label}>ANSSAL</span>
                            {isEditing ? (
                              RNumber("anssal")
                            ) : (
                              <span>{fmt(data.anssal)}</span>
                            )}
                          </div>
                          <div>
                            <span className={styles.label}>Venc. ANSSAL</span>
                            {isEditing ? (
                              RDate("vencimiento_anssal")
                            ) : (
                              <span>{fmt(data.vencimiento_anssal)}</span>
                            )}
                          </div>
                          <div>
                            <span className={styles.label}>Malapraxis</span>
                            {isEditing ? (
                              RText("malapraxis")
                            ) : (
                              <span>{fmt(data.malapraxis)}</span>
                            )}
                          </div>
                          <div>
                            <span className={styles.label}>
                              Venc. malapraxis
                            </span>
                            {isEditing ? (
                              RDate("vencimiento_malapraxis")
                            ) : (
                              <span>{fmt(data.vencimiento_malapraxis)}</span>
                            )}
                          </div>
                          <div>
                            <span className={styles.label}>Cobertura</span>
                            {isEditing ? (
                              RNumber("cobertura")
                            ) : (
                              <span>{fmt(data.cobertura)}</span>
                            )}
                          </div>
                          <div>
                            <span className={styles.label}>
                              Venc. cobertura
                            </span>
                            {isEditing ? (
                              RDate("vencimiento_cobertura")
                            ) : (
                              <span>{fmt(data.vencimiento_cobertura)}</span>
                            )}
                          </div>
                          <div>
                            <span className={styles.label}>CBU</span>
                            {isEditing ? (
                              RText("cbu")
                            ) : (
                              <span>{fmt(data.cbu)}</span>
                            )}
                          </div>
                          <div>
                            <span className={styles.label}>Observación</span>
                            {isEditing ? (
                              RText("observacion")
                            ) : (
                              <span>{fmt(data.observacion)}</span>
                            )}
                          </div>
                        </div>

                        {isEditing && (
                          <div className={styles.editActions}>
                            <Button
                              variant="primary"
                              disabled={saving}
                              onClick={async () => {
                                if (!data) return;
                                try {
                                  setSaving(true);
                                  const payload: Record<string, any> = {};
                                  Object.entries(draft).forEach(([k, v]) => {
                                    if (v !== undefined) payload[k] = v;
                                  });
                                  console.log("PATCH payload:", payload);
                                  await updateMedico(
                                    data.id,
                                    normalizePatch(payload)
                                  );
                                  const fresh = await getMedicoDetail(
                                    String(data.id)
                                  );
                                  setData(fresh);
                                  setIsEditing(false);
                                  setDraft({});
                                } catch (e: any) {
                                  alert(
                                    e?.message ||
                                      "No se pudo guardar los cambios."
                                  );
                                } finally {
                                  setSaving(false);
                                }
                              }}
                            >
                              {saving ? "Guardando…" : "Guardar cambios"}
                            </Button>
                            <Button
                              variant="ghost"
                              onClick={() => {
                                setIsEditing(false);
                                setDraft({});
                              }}
                            >
                              Cancelar
                            </Button>
                          </div>
                        )}
                      </motion.div>
                    )}

                    {/* === Documentos === */}
                    {tab === "documentos" && (
                      <motion.div
                        key="docs"
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 8 }}
                        className={styles.tabBody}
                      >
                        <div className={styles.docsHeaderInline}>
                          <h5 className={styles.section}>Documentación</h5>
                          <div className={styles.docActionsRight}>
                            <Button
                              variant="primary"
                              onClick={() => {
                                docs.forEach((d) => {
                                  const a = document.createElement("a");
                                  a.href = d.url;
                                  a.download = d.file_name;
                                  document.body.appendChild(a);
                                  a.click();
                                  a.remove();
                                });
                              }}
                            >
                              Descargar todo
                            </Button>
                            <Button
                              variant="ghost"
                              style={{ marginLeft: 8 }}
                              onClick={() => {
                                setDocFile(null);
                                setDocCustom("");
                                setDocLabel(labelOptions[0] || "attach_titulo");
                                setDocOpen(true);
                              }}
                            >
                              <Plus size={16} />
                              &nbsp;Agregar documento
                            </Button>
                          </div>
                        </div>

                        {docsLoading ? (
                          <p className={styles.muted}>Cargando…</p>
                        ) : docs.length === 0 ? (
                          <p className={styles.muted}>No hay documentos.</p>
                        ) : (
                          <ul className={styles.docList}>
                            {docs.map((doc) => (
                              <li key={doc.id} className={styles.docItem}>
                                <div>
                                  <p className={styles.docLabel}>
                                    {prettyFromAnyLabel(doc.label)}
                                  </p>
                                  <p className={styles.docName}>
                                    {doc.file_name}
                                  </p>
                                </div>
                                <div className={styles.docActions}>
                                  <Button
                                    variant="primary"
                                    size="sm"
                                    onClick={() =>
                                      window.open(
                                        doc.url,
                                        "_blank",
                                        "noopener,noreferrer"
                                      )
                                    }
                                  >
                                    Descargar
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    style={{ marginLeft: 8 }}
                                    onClick={() => askDeleteDoc(doc)}
                                  >
                                    Eliminar
                                  </Button>
                                </div>
                              </li>
                            ))}
                          </ul>
                        )}
                      </motion.div>
                    )}

                    {/* === Especialidades === (sin cambios funcionales) */}
                    {tab === "especialidades" && (
                      <motion.div
                        key="tab-especialidades"
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 8 }}
                        className={styles.tabBody}
                      >
                        <div className={styles.conceptsHeader}>
                          <h5 className={styles.section}>
                            Especialidades adheridas
                          </h5>
                          <Button
                            variant="primary"
                            onClick={() => {
                              setAssocEspOpen(true);
                              setAssocEspId("");
                              setAssocEspResol("");
                              setAssocEspDate(null);
                              setAssocEspFile(null);
                            }}
                          >
                            <Plus size={16} />
                            &nbsp;Agregar especialidad
                          </Button>
                        </div>

                        {espLoading && (
                          <p className={styles.muted}>
                            Cargando especialidades…
                          </p>
                        )}
                        {especErr && (
                          <p className={styles.errorInline}>{especErr}</p>
                        )}

                        {!espLoading && !especErr && (
                          <div className={styles.tableWrap}>
                            <table className={styles.table}>
                              <thead>
                                <tr>
                                  <th>ID colegio</th>
                                  <th>Especialidad</th>
                                  <th>N° resolución</th>
                                  <th>Fecha resolución</th>
                                  <th>Adjunto</th>
                                  <th style={{ width: 120 }}>Acciones</th>
                                </tr>
                              </thead>
                              <tbody>
                                {(especs || []).length === 0 ? (
                                  <tr>
                                    <td
                                      colSpan={6}
                                      className={styles.mutedCenter}
                                    >
                                      Sin especialidades asociadas.
                                    </td>
                                  </tr>
                                ) : (
                                  especs.map((r) => {
                                    const removing = rmEspBusy === r.id;
                                    return (
                                      <tr key={r.id}>
                                        <td>{r.id}</td>
                                        <td>{r.nombre ?? `ID ${r.id}`}</td>
                                        <td>{r.n_resolucion ?? "—"}</td>
                                        <td>
                                          {r.fecha_resolucion
                                            ? new Date(
                                                r.fecha_resolucion
                                              ).toLocaleDateString("es-AR")
                                            : "—"}
                                        </td>
                                        <td>
                                          {r.adjunto_url ? (
                                            <Button
                                              size="sm"
                                              variant="primary"
                                              onClick={() => {
                                                const href = r.adjunto_url;
                                                if (href)
                                                  window.open(
                                                    href,
                                                    "_blank",
                                                    "noopener,noreferrer"
                                                  );
                                              }}
                                              title="Abrir adjunto"
                                              style={{ padding: "4px 8px" }}
                                            >
                                              Ver adjunto
                                            </Button>
                                          ) : (
                                            "—"
                                          )}
                                        </td>
                                        <td>
                                          <Button
                                            size="sm"
                                            variant="danger"
                                            disabled={removing}
                                            onClick={() => {
                                              setEspToDelete(r);
                                              setDelEspOpen(true);
                                            }}
                                          >
                                            {removing ? "Quitando…" : "Quitar"}
                                          </Button>
                                        </td>
                                      </tr>
                                    );
                                  })
                                )}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </motion.div>
                    )}

                    {/* === Permisos === */}
                    {tab === "permisos" && (
                      <RequirePermission scope="rbac:gestionar">
                        <motion.div
                          key="rbac"
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 8 }}
                          className={`${styles.tabBody} ${styles.perms}`}
                        >
                          <div className={styles.tableWrap}>
                            <h5 className={styles.section}>Roles</h5>
                            <table className={styles.table}>
                              <tbody>
                                {rbacLoading ? (
                                  <tr>
                                    <td className={styles.mutedCenter}>
                                      Cargando…
                                    </td>
                                  </tr>
                                ) : rolesAll.length === 0 ? (
                                  <tr>
                                    <td className={styles.mutedCenter}>
                                      Sin roles
                                    </td>
                                  </tr>
                                ) : (
                                  rolesAll.map((r) => {
                                    const checked = userRoles.includes(r.name);
                                    return (
                                      <tr key={r.name}>
                                        <td>
                                          <input
                                            type="checkbox"
                                            checked={checked}
                                            onChange={async (e) => {
                                              if (e.target.checked)
                                                await addUserRole(
                                                  medicoId,
                                                  r.name
                                                );
                                              else
                                                await delUserRole(
                                                  medicoId,
                                                  r.name
                                                );
                                              const rs = await getUserRoles(
                                                medicoId
                                              );
                                              setUserRoles(
                                                rs.map((x) => x.name)
                                              );
                                              const eff = await getEffective(
                                                medicoId
                                              );
                                              setEffective(eff.permissions);
                                            }}
                                          />
                                        </td>
                                        <td>
                                          {r.name.charAt(0).toUpperCase() +
                                            r.name.slice(1)}
                                        </td>
                                      </tr>
                                    );
                                  })
                                )}
                              </tbody>
                            </table>
                          </div>

                          <div className={styles.tableWrap}>
                            <h5 className={styles.section}>Permisos</h5>
                            <table className={styles.table}>
                              <tbody>
                                {rbacLoading ? (
                                  <tr>
                                    <td className={styles.mutedCenter}>
                                      Cargando…
                                    </td>
                                  </tr>
                                ) : permList.length === 0 ? (
                                  <tr>
                                    <td className={styles.mutedCenter}>
                                      Sin permisos
                                    </td>
                                  </tr>
                                ) : (
                                  permList.map((p) => {
                                    const has = effective.includes(p.code);
                                    return (
                                      <tr key={p.code}>
                                        <td>{p.description}</td>
                                        <td style={{ textAlign: "right" }}>
                                          <input
                                            type="checkbox"
                                            checked={has}
                                            onChange={async (e) => {
                                              await setOverride(
                                                medicoId,
                                                p.code,
                                                e.target.checked
                                              );
                                              const eff = await getEffective(
                                                medicoId
                                              );
                                              setEffective(eff.permissions);
                                              const ovs = await getOverrides(
                                                medicoId
                                              );
                                              const map: Record<
                                                string,
                                                boolean
                                              > = {};
                                              ovs.forEach(
                                                (o) => (map[o.code] = o.allow)
                                              );
                                              setOverrides(map);
                                            }}
                                          />
                                        </td>
                                      </tr>
                                    );
                                  })
                                )}
                              </tbody>
                            </table>
                          </div>
                        </motion.div>
                      </RequirePermission>
                    )}
                  </AnimatePresence>
                </Card>
              </div>
            </div>
          )}
        </motion.div>
      </div>

      {/* ===== Modal: Agregar documento ===== */}
      <ActionModal
        open={docOpen}
        onClose={() => setDocOpen(false)}
        size="sm"
        title="Agregar documento"
        confirmText="Subir"
        confirmDisabled={!docFile || (docLabel === "otro" && !docCustom.trim())}
        onConfirm={async () => {
          try {
            await tryUploadDocumento(); // mantiene el modal abierto si abre 'reemplazar'
            // Si se subió sin reemplazo: avisá éxito y cerrá
            // (performUploadAndMap cierra el modal; si querés notificar ahí, movelo adentro)
            notify.success(
              "Documento agregado",
              "El archivo se subió correctamente."
            );
          } catch (e: any) {
            notify.error("No se pudo agregar el documento", e?.message);
            throw e; // mantiene abierto
          }
        }}
      >
        <div className={styles.rsField}>
          <label>Tipo de documento</label>
          <select
            className={styles.select}
            value={docLabel}
            onChange={(e) => setDocLabel(e.target.value)}
          >
            {(labelOptions || DEFAULT_LABELS).map((l) => (
              <option key={l} value={l}>
                {formatOption(l)}
              </option>
            ))}
          </select>
        </div>

        {docLabel === "otro" && (
          <div className={styles.rsField}>
            <label>Descripción (label)</label>
            <input
              className={styles.input}
              value={docCustom}
              onChange={(e) => setDocCustom(e.target.value)}
              placeholder="Ej: constancia_especial"
            />
            <small className={styles.muted}>
              Se guardará como etiqueta{" "}
              <code>
                {docCustom.trim().toLowerCase().replace(/\s+/g, "_") ||
                  "constancia_especial"}
              </code>
            </small>
          </div>
        )}

        <div className={styles.rsField}>
          <label>Archivo</label>
          <input
            type="file"
            accept=".pdf,.jpg,.jpeg,.png"
            onChange={(e) => setDocFile(e.target.files?.[0] ?? null)}
          />
        </div>
      </ActionModal>

      {/* ===== Modal: Reemplazar documento de mismo tipo ===== */}
      <ActionModal
        open={replaceOpen}
        onClose={() => {
          setReplaceOpen(false);
          setPendingUpload(null);
        }}
        size="xs"
        title="Reemplazar documento"
        confirmText="Reemplazar"
        onConfirm={async () => {
          try {
            await handleConfirmReplace();
            notify.success("Documento reemplazado", "Se actualizó el archivo.");
          } catch (e: any) {
            notify.error("No se pudo reemplazar el documento", e?.message);
            throw e;
          }
        }}
      >
        <p style={{ lineHeight: 1.5 }}>
          Ya existe un documento del tipo <strong>{replacePretty}</strong>. Si
          continuás, el archivo actual será <strong>reemplazado</strong>.
        </p>
        <p>¿Querés continuar?</p>
      </ActionModal>

      {/* ===== Modal: Confirmar eliminación de doc ===== */}
      <ActionModal
        open={delDocOpen}
        onClose={() => setDelDocOpen(false)}
        size="xs"
        title="Eliminar documento"
        confirmText="Eliminar"
        onConfirm={async () => {
          if (!docToDelete) return;
          try {
            // limpiar mapping attach_* si corresponde
            const normalized = normalizeForCompare(docToDelete.label);
            const attachKey = ATTACH_KEYS.find(
              (k) => stripAttach(k) === normalized
            );
            if (attachKey) {
              await clearMedicoAttach(medicoId, attachKey);
            }
            await deleteMedicoDocumento(medicoId, docToDelete.id);
            await reloadDocs();
            setDocToDelete(null);
            notify.success("Documento eliminado");
          } catch (e: any) {
            notify.error("No se pudo eliminar el documento", e?.message);
            throw e;
          }
        }}
      >
        <p>
          ¿Seguro que querés eliminar{" "}
          <strong>
            {docToDelete
              ? prettyFromAnyLabel(docToDelete.label)
              : "este documento"}
          </strong>
          ?
        </p>
      </ActionModal>

      {/* ===== Modal: Agregar especialidad ===== */}
      <ActionModal
        open={assocEspOpen}
        onClose={() => setAssocEspOpen(false)}
        size="lg"
        title="Agregar especialidad"
        confirmText="Asociar"
        confirmDisabled={!assocEspId}
        onConfirm={async () => {
          if (!id || !assocEspId) return;
          try {
            let adjuntoId: number | null = null;
            if (assocEspFile) {
              adjuntoId = await uploadDocumento(id, assocEspFile);
            }
            await addMedicoEspecialidad(id, {
              id_colegio: Number(assocEspId),
              n_resolucion: assocEspResol?.trim() || null,
              fecha_resolucion: toYmd(assocEspDate),
              adjunto_id: adjuntoId,
            });
            const rr = await getMedicoEspecialidades(medicoId);
            setEspecs(rr);
            setAssocEspId("");
            setAssocEspResol("");
            setAssocEspDate(null);
            setAssocEspFile(null);
            notify.success("Especialidad asociada");
          } catch (e: any) {
            notify.error("No se pudo asociar la especialidad", e?.message);
            throw e; // mantiene abierto
          }
        }}
      >
        <div className={styles.modalGrid}>
          <div className={styles.field}>
            <label>Especialidad</label>
            <select
              className={styles.select}
              value={assocEspId}
              onChange={(e) => setAssocEspId(e.target.value)}
            >
              <option value="">Seleccionar…</option>
              {espOptions.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.field}>
            <label>N° de resolución</label>
            <input
              className={styles.input}
              value={assocEspResol}
              onChange={(e) => setAssocEspResol(e.target.value)}
              placeholder="Ej: 12345/2024"
            />
          </div>

          <div className={styles.field}>
            <label>Fecha de resolución</label>
            <DatePicker
              selected={assocEspDate}
              onChange={(d) => setAssocEspDate(d)}
              className={styles.dateInput}
              dateFormat="dd-MM-yyyy"
              placeholderText="dd-MM-aaaa"
              closeOnScroll
              showPopperArrow={false}
            />
          </div>

          <div className={styles.field}>
            <label>Adjunto (PDF/JPG/PNG)</label>
            <input
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              onChange={(e) => setAssocEspFile(e.target.files?.[0] ?? null)}
            />
          </div>
        </div>
      </ActionModal>

      {/* ===== Modal: Eliminar socio ===== */}
      <ActionModal
        open={delOpen}
        onClose={() => setDelOpen(false)}
        size="xs"
        title="Eliminar socio"
        confirmText="Eliminar definitivamente"
        onConfirm={async () => {
          try {
            await deleteMedico(medicoId);
            notify.success("Socio eliminado");
            setDelOpen(false);
            nav("/doctors");
          } catch (e: any) {
            notify.error("No se pudo eliminar el socio", e?.message);
            throw e;
          }
        }}
      >
        <div>
          <p style={{ lineHeight: 1.5 }}>
            <strong>Atención:</strong> esta acción es{" "}
            <strong>definitiva</strong>. Si eliminás al socio,{" "}
            <u>no vas a poder deshacerla</u>.
          </p>
          <p>¿Querés continuar?</p>
        </div>
      </ActionModal>

      {/* ===== Modal: Confirmar quitar especialidad ===== */}
      <ActionModal
        open={delEspOpen}
        onClose={() => {
          setDelEspOpen(false);
          setEspToDelete(null);
        }}
        size="xs"
        title="Quitar especialidad"
        confirmText="Confirmar"
        onConfirm={async () => {
          if (!id || !espToDelete) return;
          try {
            await removeMedicoEspecialidad(id, espToDelete.id);
            const rr = await getMedicoEspecialidades(medicoId);
            setEspecs(rr);
            setEspToDelete(null);

            notify.success("Especialidad quitada");
          } catch (e: any) {
            notify.error("No se pudo quitar la especialidad", e?.message);
            throw e;
          }
        }}
      >
        <p style={{ lineHeight: 1.5 }}>
          Vas a quitar la especialidad{" "}
          <strong>
            {espToDelete
              ? espToDelete.nombre ?? `ID ${espToDelete.id}`
              : "seleccionada"}
          </strong>{" "}
          (ID colegio: {espToDelete?.id}).
        </p>
        <p style={{ marginTop: 8 }}>
          Esta acción solo desvincula la especialidad del profesional; no
          elimina la especialidad del catálogo.
        </p>
        <p style={{ marginTop: 8 }}>¿Querés continuar?</p>
      </ActionModal>
    </div>
  );
};

export default DoctorProfilePage;
