"use client";

import React, { Suspense, lazy, useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { Pencil, ShieldCheck, Trash2, User } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import "react-datepicker/dist/react-datepicker.css";

import Card from "@/app/components/ui/Card/Card";
import Franja from "@/app/components/layout/Franja/Franja";
import Button from "@/app/components/ui/Button/Button";
import styles from "./DoctorProfilePage.module.scss";

import RequirePermission from "../../auth/RequirePermission";
import { usePermisos } from "../../auth/usePermisos";
import { useAuth } from "../../auth/useAuth";
import { esOrganizacion, isMedico, ROL_MEDICO } from "../../auth/roles";
import BackButton from "@/app/components/ui/BackButton/BackButton";
import Credencial from "./Credencial";
import FormularioCambiosModal from "./FormularioCambiosModal";
import ReportarCambioModal from "./ReportarCambioModal";
import type { ReportTarget } from "./ReportarCambioModal";
import { deleteMedico, ETIQUETA_ESTADO_CUENTA } from "./api";

import Switch from "@mui/material/Switch";
import ActionModal from "@/app/components/ui/ActionModal/ActionModal";
import { useNotify } from "../../hooks/useNotify";
import Cargando from "@/app/components/ui/Cargando/Cargando";

import ModalesDocumentos from "./legajo/ModalesDocumentos";
import ModalesEspecialidades from "./legajo/ModalesEspecialidades";
import TabConceptos from "./legajo/TabConceptos";
import TabDatos from "./legajo/TabDatos";
import TabDocumentos from "./legajo/TabDocumentos";
import TabEspecialidades from "./legajo/TabEspecialidades";
import TabPermisos from "./legajo/TabPermisos";
import { crearReportar } from "./legajo/reportar";
import { TAB_ICONS, TAB_LABELS } from "./legajo/pestanas";
import type { TabKey } from "./legajo/legajo.types";
import { useLegajoConceptos } from "./legajo/useLegajoConceptos";
import { useLegajoDatos } from "./legajo/useLegajoDatos";
import { useLegajoDocumentos } from "./legajo/useLegajoDocumentos";
import { useLegajoEspecialidades } from "./legajo/useLegajoEspecialidades";
import { useLegajoPermisos } from "./legajo/useLegajoPermisos";
import { mensajeDe } from "./legajo/legajo.helpers";
import BotonPlano from "@/app/components/ui/BotonPlano/BotonPlano";

// Sólo la abre el personal: que no viaje en el chunk del legajo del socio.
const ValoresPdfTab = lazy(() => import("./ValoresPdfTab"));

// Estas dos pestañas son del lado del Colegio y traen lo más pesado del legajo: Reportes, la librería de gráficos; Padrones, la animación de confirmación.
const ReportesMedico = lazy(() => import("../Reportes/ReportesMedico"));
const PadronesForm = lazy(
  () => import("@/app/features/padrones/components/PadronesForm/PadronesForm")
);

type DoctorProfilePageProps = {
  /** Fija el legajo en vez de tomarlo de la URL (lo usa "Mi perfil"). */
  medicoId?: number | string;
  /** Oculta toda la UI de edición: alta/baja, adjuntos, especialidades y conceptos. */
  readOnly?: boolean;
};

const DoctorProfilePage: React.FC<DoctorProfilePageProps> = ({
  medicoId: medicoIdProp,
  readOnly = false,
}) => {
  const { id } = useParams<{ id: string }>();
  const medicoId = String(medicoIdProp ?? id);
  const nav = useNavigate();
  const notify = useNotify();
  const location = useLocation();
  const { user } = useAuth();
  const { can } = usePermisos();

  const [tab, setTab] = useState<TabKey>("datos");

  const datos = useLegajoDatos(medicoId, readOnly);
  const { data, loading, estadoCuenta, toggleBusy, cambiarEstado } = datos;
  const documentos = useLegajoDocumentos(medicoId, tab);
  const especialidades = useLegajoEspecialidades(medicoId, tab);
  const { especs } = especialidades;
  const conceptos = useLegajoConceptos(medicoId, tab);
  const permisos = useLegajoPermisos(medicoId, tab, readOnly);

  // El personal del Colegio también tiene legajo en `listado_medico`, pero no es médico: sin "Dr./Dra." en la credencial y sin especialidades.
  const esLegajoPropio = user?.id != null && String(user.id) === medicoId;
  const rolLegajo: string | null = data?.rol ?? (esLegajoPropio ? user?.role : null) ?? null;
  const legajoEsMedico = rolLegajo == null || rolLegajo === ROL_MEDICO;

  // Línea bajo el nombre en "Mi perfil": especialidad · matrícula · socio.
  const resumenLegajo = [
    legajoEsMedico
      ? data?.especialidades?.[0]?.especialidad_nombre
      : "Personal de Colegio Médico",
    data?.matricula_prov ? `MP ${data.matricula_prov}` : null,
    data?.nro_socio ? `Socio ${data.nro_socio}` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  // «Valores PDF» es del personal y sólo en "Mi perfil": junta los PDF que se adjuntan en el historial de valores de cada obra social.
  const visibleTabs: TabKey[] = (
    readOnly
      ? esOrganizacion(user)
        ? (["datos", "documentos", "especialidades"] as TabKey[])
        : ([
            "datos",
            "documentos",
            "especialidades",
            "credencial",
            ...(isMedico(user) ? [] : ["valoresPdf"]),
          ] as TabKey[])
      : ([
          "datos",
          "documentos",
          "especialidades",
          "conceptos",
          "padrones",
          "credencial",
          "reportes",
        ] as TabKey[])
  ).filter((k) => k !== "especialidades" || legajoEsMedico);

  // Reclamo de corrección: sólo existe en modo lectura, que es como el socio ve su propio legajo.
  const [reportTarget, setReportTarget] = useState<ReportTarget | null>(null);
  // Formulario completo: el socio revisa todos sus datos editables de una.
  const [formularioOpen, setFormularioOpen] = useState(false);

  // El personal con `medico:editar` ya puede editar cualquier legajo desde el padrón: en "Mi perfil" edita el suyo en vez de pedir la corrección.
  const editaSuLegajo =
    readOnly && esLegajoPropio && !isMedico(user) && can("medico:editar");
  const reportar = crearReportar(readOnly && !editaSuLegajo, setReportTarget);

  const [delOpen, setDelOpen] = useState(false);

  useEffect(() => {
    const estado = location.state as { fromPath?: string; tab?: string } | null;
    const fromPath = estado?.fromPath;
    const cameFromAfiliados =
      estado?.tab === "padrones" ||
      (typeof fromPath === "string" &&
        fromPath.includes("/panel/afiliadospadron")) ||
      sessionStorage.getItem("cmc_open_padrones_next") === "1";

    if (!cameFromAfiliados) return;

    sessionStorage.removeItem("cmc_open_padrones_next");
    setTab("padrones");
  }, [location.state, medicoId]);

  return (
    <>
      {!readOnly && <Franja suelta titulo="Socio" icono={User} />}
    <div className={styles.page}>
      <div className={`${styles.content} ${styles.mpContent}`}>
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
              <Cargando size={36} tono="marca" aria-label="Cargando perfil…" />
              <p>Cargando perfil…</p>
            </Card>
          ) : !data ? (
            <Card className={styles.errorCard}>
              <p>No se encontró el profesional solicitado.</p>
            </Card>
          ) : (
            <div
              className={`${styles.profileLayout} ${styles.miPerfil}`}
            >
              <div className={styles.rightCol}>
                <Card className={styles.headerCard}>
                  <div className={styles.profileHeader}>
                    <div className={styles.headerMain}>
                      <span
                        className={`${styles.mpEstado} ${
                          estadoCuenta === "activo" ? "" : styles.mpEstadoInactivo
                        }`}
                      >
                        {ETIQUETA_ESTADO_CUENTA[estadoCuenta]}
                      </span>
                      <h2 className={styles.name}>{data.name}</h2>
                      <p className={styles.mpSub}>{resumenLegajo}</p>
                    </div>

                    {!readOnly && (
                    <div className={styles.headerActions}>
                      <div
                        className={styles.toggleWrap}
                        title="Activar / dar de baja la cuenta (la baja cierra sus sesiones)"
                      >
                        <span
                          className={styles.muted}
                          style={{ marginRight: 8 }}
                        >
                          {ETIQUETA_ESTADO_CUENTA[estadoCuenta]}
                        </span>
                        <Switch
                          checked={estadoCuenta === "activo"}
                          disabled={toggleBusy}
                          onChange={(_e, checked) => cambiarEstado(checked)}
                          inputProps={{ "aria-label": "Activar o dar de baja la cuenta" }}
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
                    )}

                    {/* Salida general para lo que no tiene su propio "reportar" al lado (especialidades, padrón, cualquier otra cosa). */}
                    {readOnly && !editaSuLegajo && (
                      <div className={styles.headerActions}>
                        <Button
                          variant="ghost"
                          onClick={() => setFormularioOpen(true)}
                          title="Revisar y corregir tus datos"
                        >
                          <Pencil size={16} />
                          &nbsp;Corregir
                        </Button>
                      </div>
                    )}
                  </div>

                  <div className={styles.tabs} id="doctor-tabs-root">
                    {visibleTabs.map((k) => {
                      const TabIcon = TAB_ICONS[k];
                      return (
                      <BotonPlano
                        key={k}
                        className={`${styles.tab} ${
                          tab === k ? styles.tabActive : ""
                        }`}
                        onClick={() => setTab(k)}
                      >
                        {TabIcon && <TabIcon size={20} aria-hidden="true" />}
                        {TAB_LABELS[k] ?? k[0].toUpperCase() + k.slice(1)}
                        {tab === k && (
                          <motion.span
                            layoutId="tab-underline"
                            className={styles.tabUnderline}
                          />
                        )}
                      </BotonPlano>
                      );
                    })}
                    {/* Permisos es administración de RBAC, no parte del legajo: queda fuera de "Mi perfil" aunque el socio tenga rbac:gestionar. */}
                    {!readOnly && (
                      <RequirePermission scope="rbac:gestionar">
                        <BotonPlano
                          className={`${styles.tab} ${
                            tab === "permisos" ? styles.tabActive : ""
                          }`}
                          onClick={() => setTab("permisos")}
                        >
                          <ShieldCheck size={20} aria-hidden="true" />
                          Permisos
                          {tab === "permisos" && (
                            <motion.span
                              layoutId="tab-underline"
                              className={styles.tabUnderline}
                            />
                          )}
                        </BotonPlano>
                      </RequirePermission>
                    )}
                  </div>

                  <AnimatePresence mode="wait">
                    {tab === "datos" && data && (
                      <motion.div
                        key="tab-datos"
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 8 }}
                        className={`${styles.tabBody} ${styles.mpDatos}`}
                      >
                        <TabDatos
                          data={data}
                          readOnly={readOnly}
                          editaSuLegajo={editaSuLegajo}
                          edicion={datos}
                          reportar={reportar}
                        />
                      </motion.div>
                    )}

                    {tab === "documentos" && (
                      <motion.div
                        key="docs"
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 8 }}
                        className={styles.tabBody}
                      >
                        <TabDocumentos readOnly={readOnly} documentos={documentos} />
                      </motion.div>
                    )}

                    {tab === "especialidades" && (
                      <motion.div
                        key="tab-especialidades"
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 8 }}
                        className={styles.tabBody}
                      >
                        <TabEspecialidades
                          readOnly={readOnly}
                          especialidades={especialidades}
                        />
                      </motion.div>
                    )}

                    {tab === "conceptos" && (
                      <motion.div
                        key="tab-conceptos"
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 8 }}
                        className={styles.tabBody}
                      >
                        <TabConceptos conceptos={conceptos} />
                      </motion.div>
                    )}

                    {tab === "padrones" && (
                      <motion.div
                        key="tab-padrones"
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 8 }}
                        className={`${styles.tabBodyPadrones}`}
                      >
                        <div className={styles.padronesWrap}>
                          <Suspense fallback={null}>
                            <PadronesForm medicoId={medicoId} />
                          </Suspense>
                        </div>
                      </motion.div>
                    )}

                    {tab === "credencial" && data && (
                      <motion.div
                        key="tab-credencial"
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 8 }}
                        className={styles.tabBody}
                      >
                        <Credencial
                          nombre={
                            data.apellido && data.nombre_
                              ? `${String(data.apellido).toUpperCase()} ${data.nombre_}`
                              : (data.name ?? "")
                          }
                          sexo={data.sexo}
                          documento={data.documento}
                          // Primera especialidad adherida; si no tiene, no se muestra.
                          especialidad={especs[0]?.nombre ?? null}
                          activo={data.estado_cuenta === "activo"}
                          esMedico={legajoEsMedico}
                        />
                      </motion.div>
                    )}

                    {/* Misma condición que la pestaña: el panel no se dibuja aunque `tab` llegara a valer "valoresPdf" por otra vía. */}
                    {tab === "valoresPdf" && visibleTabs.includes("valoresPdf") && (
                      <motion.div
                        key="tab-valores-pdf"
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 8 }}
                        className={styles.tabBody}
                      >
                        <Suspense fallback={null}>
                          <ValoresPdfTab />
                        </Suspense>
                      </motion.div>
                    )}

                    {/* `!readOnly` acompaña a la pestaña: aunque el botón ya no se dibuja en "Mi perfil". */}
                    {tab === "reportes" && !readOnly && data && (
                      <motion.div
                        key="tab-reportes"
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 8 }}
                        className={styles.tabBody}
                      >
                        <Suspense fallback={null}>
                          <ReportesMedico
                            nroSocio={String(data.nro_socio ?? medicoId)}
                          />
                        </Suspense>
                      </motion.div>
                    )}

                    {tab === "permisos" && !readOnly && (
                      <RequirePermission scope="rbac:gestionar">
                        <motion.div
                          key="rbac"
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 8 }}
                          className={`${styles.tabBody} ${styles.perms}`}
                        >
                          <TabPermisos permisos={permisos} />
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

      <ModalesDocumentos medicoId={medicoId} documentos={documentos} />

      <ModalesEspecialidades
        id={id}
        medicoId={medicoId}
        especialidades={especialidades}
      />

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
          } catch (e: unknown) {
            notify.error("No se pudo eliminar el socio", mensajeDe(e));
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

      <ReportarCambioModal
        target={reportTarget}
        onClose={() => setReportTarget(null)}
      />

      <FormularioCambiosModal
        open={formularioOpen}
        onClose={() => setFormularioOpen(false)}
      />
    </div>
    </>
  );
};

export default DoctorProfilePage;
