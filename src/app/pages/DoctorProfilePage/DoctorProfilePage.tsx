// app/pages/DoctorProfile/DoctorProfilePage.tsx
"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Pencil, Plus, X } from "lucide-react";
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
} from "./api";

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

// si NO querés que alguno sea numérico, simplemente sacalo de acá.
const INT_FIELDS = new Set([
  "anssal",
  "cobertura",
  "nro_socio",
  "matricula_prov",
  "matricula_nac",
]);

// ====== HELPERS CHIQUITOS ======
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
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s; // ya viene yyyy-mm-dd
  const m = s.match(/^(\d{2})-(\d{2})-(\d{4})$/); // dd-mm-yyyy
  if (m) return `${m[3]}-${m[2]}-${m[1]}`;
  return s; // lo dejas pasar y el back lo normaliza si quiere
};

// ====== EL ÚNICO NORMALIZE QUE NECESITÁS ======
export function normalizePatch(input: Record<string, any>) {
  const out: Record<string, any> = {};

  for (const [k, raw] of Object.entries(input || {})) {
    // 1) fuera lo que no esté en la whitelist
    if (!WL.has(k)) continue;

    // 2) "" o "-----" -> null
    if (isBlankish(raw) || isDashish(raw)) {
      out[k] = null;
      continue;
    }

    // 3) fechas
    if (DATE_FIELDS.has(k)) {
      out[k] = toYmd2(raw);
      continue;
    }

    // 4) enteros "amigables"
    if (INT_FIELDS.has(k)) {
      const s = String(raw).replace(/\./g, "").replace(/,/g, "").trim();
      out[k] = /^\d+$/.test(s) ? Number(s) : null;
      continue;
    }

    // 5) default: lo que venga
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
  // | "deudas"
  | "documentos"
  // | "reportes"
  | "conceptos"
  | "especialidades"
  | "permisos";

const DoctorProfilePage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const medicoId = id!;

  const [tab, setTab] = useState<TabKey>("datos");

  // perfil
  const [data, setData] = useState<DoctorProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Editar perfil
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  // mantenemos un draft parcial; solo mandamos lo que cambia
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
  // conceptos (desc por nro_colegio)
  // const [concepts, setConcepts] = useState<DoctorConcept[]>([]);
  // const [conceptsLoading, setConceptsLoading] = useState(false);
  // const [conceptsErr, setConceptsErr] = useState<string | null>(null);

  // documentos
  const [docs, setDocs] = useState<DoctorDocument[]>([]);
  const [docsLoading, setDocsLoading] = useState(false);

  // catálogos
  // const [descOptions, setDescOptions] = useState<Option[]>([]); // id = nro_colegio
  // const [espOptions, setEspOptions] = useState<Option[]>([]); // id = Especialidad.ID

  // asociar modales
  // const [assocDescOpen, setAssocDescOpen] = useState(false);
  // const [assocDescId, setAssocDescId] = useState<string>(""); // nro_colegio
  // const [assocDescBusy, setAssocDescBusy] = useState(false);
  const [rmEspBusy, setRmEspBusy] = useState<number | null>(null); // Especialidad.ID

  const [assocEspOpen, setAssocEspOpen] = useState(false);
  const [assocEspId, setAssocEspId] = useState<string>(""); // Especialidad.ID
  const [assocEspBusy, setAssocEspBusy] = useState(false);

  const [assocEspResol, setAssocEspResol] = useState<string>(""); // N° resolución
  // const [assocEspFecha, setAssocEspFecha] = useState<Date | null>(null); // Fecha resolución
  // const [assocEspAdjId, setAssocEspAdjId] = useState<string>(""); // ID del Documento (opcional)
  // const [assocEspMode, setAssocEspMode] = useState<AssocEspMode>("add");
  // const [assocEspEditId, setAssocEspEditId] = useState<number | null>(null);

  // ---- AGREGAR especialidads
  const [assocEspDate, setAssocEspDate] = useState<Date | null>(null);
  const [assocEspFile, setAssocEspFile] = useState<File | null>(null);

  // ---- EDITAR especialidad
  const [editEspOpen, setEditEspOpen] = useState(false);
  const [editEspId, setEditEspId] = useState<number | null>(null); // id_colegio
  const [editEspResol, setEditEspResol] = useState("");
  const [editEspDate, setEditEspDate] = useState<Date | null>(null);
  const [editEspFile, setEditEspFile] = useState<File | null>(null);
  const [editEspBusy, setEditEspBusy] = useState(false);

  // quitar busy
  // const [rmConceptBusy, setRmConceptBusy] = useState<number | null>(null); // nro_colegio
  const [espOptions, setEspOptions] = useState<Option[]>([]);
  // const [permBusy, setPermBusy] = useState<string | null>(null);

  async function loadEspec() {
    setEspLoading(true);
    try {
      const r = await getMedicoEspecialidades(medicoId);
      setEspecs(r);
    } finally {
      setEspLoading(false);
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

  // input numérico
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

  // selector sexo (si aplicara)
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

  // fecha con DatePicker (almacenamos en draft como string "YYYY-MM-DD")
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

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      try {
        const d = await getMedicoDetail(medicoId);
        if (!alive) return;
        setData(d);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [medicoId]);

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

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const list = await getListEspecialidades(); // ← tu endpoint real
        if (!alive) return;

        // IMPORTANTE: muchas veces el backend usa como "id de colegio" un campo distinto.
        // Tomamos id_colegio_espe si viene; si no, caemos a id.
        const opts = (list || []).map((e: Especialidad) => ({
          id: String(e.id_colegio_espe ?? e.id),
          label: e.nombre || `ID ${e.id}`,
        }));

        setEspOptions(opts);
      } catch (err) {
        // si querés, podés dejar un fallback silencioso
        setEspOptions([]);
        console.error("No se pudo cargar especialidades:", err);
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

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
                      {/* <div className={styles.headerMeta}>
                        <div className={styles.headerMetaItem}>
                          <span className={styles.headerMetaLabel}>
                            Teléfono:
                          </span>
                          <span className={styles.headerMetaValue}>
                            {data.telefono_consulta}
                          </span>
                        </div>
                      </div> */}
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
                        {/* ===== Datos personales ===== */}
                        <button
                          type="button"
                          className={styles.editPencil}
                          aria-label={isEditing ? "Cancelar edición" : "Editar"}
                          title={isEditing ? "Cancelar edición" : "Editar"}
                          onClick={() => {
                            if (!isEditing) {
                              // entrar en modo edición: clonar datos actuales
                              setDraft({ ...data });
                              setIsEditing(true);
                            } else {
                              // cancelar
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

                        {/* ===== Datos profesionales ===== */}
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
                          {/* <div>
                            <span className={styles.label}>Especialidad</span>
                            <span>{fmt(data.specialty)}</span>
                          </div> */}
                        </div>

                        {/* ===== Datos impositivos ===== */}
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
                                  // armamos payload solo con campos presentes en draft
                                  const payload: Record<string, any> = {};
                                  Object.entries(draft).forEach(([k, v]) => {
                                    if (v !== undefined) payload[k] = v;
                                  });
                                  console.log("Queriendo editar");
                                  console.log(normalizePatch(payload));
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
                    {/* {tab === "documentos" && (
                      <motion.div
                        key="tab-documentos"
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 8 }}
                        className={styles.tabBody}
                      >
                        <div className={styles.docsHeaderInline}>
                          <h5 className={styles.section}>Documentación</h5>
                          <Button variant="primary" onClick={handleDownloadAll}>
                            Descargar todo
                          </Button>
                        </div>
                        {data.documents.length === 0 ? (
                          <p className={styles.muted}>
                            No hay documentos cargados.
                          </p>
                        ) : (
                          <ul className={styles.docList}>
                            {data.documents.map((doc) => (
                              <li key={doc.id} className={styles.docItem}>
                                <div>
                                  <p className={styles.docLabel}>
                                    {doc.pretty_label || doc.label}
                                  </p>
                                  <p className={styles.docName}>
                                    {doc.file_name || doc.file_name}
                                  </p>
                                </div>
                                <div className={styles.docActions}>
                                  <Button
                                    variant="primary"
                                    size="sm"
                                    onClick={() => {
                                      const href = doc.url;
                                      if (href)
                                        window.open(
                                          href,
                                          "_blank",
                                          "noopener,noreferrer"
                                        );
                                    }}
                                  >
                                    Descargar
                                  </Button>
                                </div>
                              </li>
                            ))}
                          </ul>
                        )}
                      </motion.div>
                    )} */}
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
                                    {doc.pretty_label || doc.label}
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
                                </div>
                              </li>
                            ))}
                          </ul>
                        )}
                      </motion.div>
                    )}

                    {/* === Especialidades === */}
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
                          {/* si mantenés el flujo de agregar, dejá este botón */}
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
                                              title="Abrir adjunto en una nueva pestaña"
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
                                            onClick={async () => {
                                              if (!id) return;
                                              try {
                                                setRmEspBusy(r.id);
                                                await removeMedicoEspecialidad(
                                                  id,
                                                  r.id
                                                ); // r.id es el id_colegio que mostrás como "ID colegio"
                                                await loadEspec();
                                              } catch (e: any) {
                                                alert(
                                                  e?.message ||
                                                    "No se pudo quitar la especialidad."
                                                );
                                              } finally {
                                                setRmEspBusy(null);
                                              }
                                            }}
                                          >
                                            {removing ? "Quitando…" : "Quitar"}
                                          </Button>

                                          <Button
                                            size="sm"
                                            variant="ghost"
                                            onClick={() => {
                                              // pre-cargar datos del item
                                              setEditEspId(r.id);
                                              setEditEspResol(
                                                r.n_resolucion ?? ""
                                              );
                                              setEditEspFile(null);
                                              // si viene "YYYY-MM-DD" del back, lo pasamos a Date
                                              const d = r.fecha_resolucion
                                                ? new Date(r.fecha_resolucion)
                                                : null;
                                              setEditEspDate(d);
                                              setEditEspOpen(true);
                                            }}
                                          >
                                            Editar
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

                    {/* === Permisos (solapa protegida) === */}
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

      {/* ===== Modal asociar especialidad ===== */}
      <AnimatePresence>
        {assocEspOpen && (
          <div className={styles.portal}>
            <motion.div
              className={styles.overlay}
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.6 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setAssocEspOpen(false)}
            />
            <motion.div
              className={styles.popup}
              role="dialog"
              aria-modal="true"
              initial={{ opacity: 0, scale: 0.95, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 16 }}
              transition={{ type: "spring", stiffness: 240, damping: 22 }}
            >
              <div className={styles.popupHeader}>
                <h3>Agregar especialidad</h3>
                <button
                  className={styles.iconButton}
                  onClick={() => setAssocEspOpen(false)}
                  aria-label="Cerrar"
                >
                  <X size={16} />
                </button>
              </div>

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
                    onChange={(e) =>
                      setAssocEspFile(e.target.files?.[0] ?? null)
                    }
                  />
                </div>
              </div>

              <div className={styles.popupButtons}>
                <Button
                  variant="primary"
                  disabled={!assocEspId || assocEspBusy}
                  onClick={async () => {
                    if (!id || !assocEspId) return;
                    try {
                      setAssocEspBusy(true);

                      // 1) si hay archivo, subir y obtener adjunto_id
                      let adjuntoId: number | null = null;
                      if (assocEspFile) {
                        adjuntoId = await uploadDocumento(id, assocEspFile);
                      }

                      // 2) armar payload para tu endpoint POST /especialidades
                      await addMedicoEspecialidad(id, {
                        id_colegio: Number(assocEspId),
                        n_resolucion: assocEspResol?.trim() || null,
                        fecha_resolucion: toYmd(assocEspDate),
                        adjunto_id: adjuntoId,
                      });

                      // 3) refrescar y cerrar
                      await loadEspec();
                      setAssocEspOpen(false);
                    } catch (e: any) {
                      alert(
                        e?.message || "No se pudo asociar la especialidad."
                      );
                    } finally {
                      setAssocEspBusy(false);
                    }
                  }}
                >
                  {assocEspBusy ? "Guardando…" : "Asociar"}
                </Button>
                <Button variant="ghost" onClick={() => setAssocEspOpen(false)}>
                  Cancelar
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {editEspOpen && (
          <div className={styles.portal}>
            <motion.div
              className={styles.overlay}
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.6 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setEditEspOpen(false)}
            />
            <motion.div
              className={styles.popup}
              role="dialog"
              aria-modal="true"
              initial={{ opacity: 0, scale: 0.95, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 16 }}
              transition={{ type: "spring", stiffness: 240, damping: 22 }}
            >
              <div className={styles.popupHeader}>
                <h3>Editar especialidad</h3>
                <button
                  className={styles.iconButton}
                  onClick={() => setEditEspOpen(false)}
                  aria-label="Cerrar"
                >
                  <X size={16} />
                </button>
              </div>

              <div className={styles.modalGrid}>
                <div className={styles.field}>
                  <label>Especialidad</label>
                  <select
                    className={styles.select}
                    value={String(editEspId ?? "")}
                    disabled
                  >
                    <option value="">Seleccionar…</option>
                    {espOptions.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                  <small className={styles.muted}>
                    La especialidad no puede cambiarse en edición.
                  </small>
                </div>

                <div className={styles.field}>
                  <label>N° de resolución</label>
                  <input
                    className={styles.input}
                    value={editEspResol}
                    onChange={(e) => setEditEspResol(e.target.value)}
                    placeholder="Ej: 12345/2024"
                  />
                </div>

                <div className={styles.field}>
                  <label>Fecha de resolución</label>
                  <DatePicker
                    selected={editEspDate}
                    onChange={(d) => setEditEspDate(d)}
                    className={styles.dateInput}
                    dateFormat="dd-MM-yyyy"
                    placeholderText="dd-MM-aaaa"
                    closeOnScroll
                    showPopperArrow={false}
                  />
                </div>

                <div className={styles.field}>
                  <label>Adjunto (reemplazar)</label>
                  <input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={(e) =>
                      setEditEspFile(e.target.files?.[0] ?? null)
                    }
                  />
                  <small className={styles.muted}>
                    Si subís un archivo, reemplaza al existente.
                  </small>
                </div>
              </div>

              <div className={styles.popupButtons}>
                <Button
                  variant="primary"
                  disabled={!editEspId || editEspBusy}
                  onClick={async () => {
                    if (!id || !editEspId) return;
                    try {
                      setEditEspBusy(true);

                      // 1) si hay archivo nuevo, subir y obtener adjunto_id
                      let adjuntoId: number | null | undefined = undefined;
                      if (editEspFile) {
                        adjuntoId = await uploadDocumento(id, editEspFile);
                      }

                      // 2) armar payload para tu endpoint PATCH /especialidades/:id_colegio
                      await editMedicoEspecialidad(id, editEspId, {
                        n_resolucion: editEspResol?.trim() || null,
                        fecha_resolucion: toYmd(editEspDate),
                        // solo enviamos adjunto_id si hay uno nuevo, para no sobreescribir a null accidentalmente.
                        ...(adjuntoId !== undefined
                          ? { adjunto_id: adjuntoId }
                          : {}),
                      });

                      // 3) refrescar y cerrar
                      await loadEspec();
                      setEditEspOpen(false);
                    } catch (e: any) {
                      alert(
                        e?.message || "No se pudo actualizar la especialidad."
                      );
                    } finally {
                      setEditEspBusy(false);
                    }
                  }}
                >
                  {editEspBusy ? "Guardando…" : "Guardar cambios"}
                </Button>
                <Button variant="ghost" onClick={() => setEditEspOpen(false)}>
                  Cancelar
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default DoctorProfilePage;
