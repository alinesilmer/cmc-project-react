import { Suspense, lazy, useMemo } from "react";
import { Routes, Route, Navigate, useLocation, matchPath, type Location } from "react-router-dom";
import {
  RUTA_EDICION, RutaCapaContext, type EstadoConFondo, type RutaCapa,
} from "./app/pages/facturacion/CargaFacturacion/capaCargaContexto";
import { AnimatePresence } from "framer-motion";

// Structural components are always needed for the panel shell → keep eager.
import RequireAuth from "./app/auth/RequireAuth";
import MedicoRouteGuard from "./app/auth/MedicoRouteGuard";
import RequireWebEditor from "./app/auth/RequireWebEditor";
import RequireScope from "./app/auth/RequireScope";
import { useAuth } from "./app/auth/AuthProvider";
import { usePermisos } from "./app/auth/usePermisos";
import { isMedico } from "./app/auth/roles";

// El layout del panel y su tema de MUI también van lazy: el sitio público (`/*`)
// no los usa y así no entran en el bundle de entrada.
const TemaPanel = lazy(() => import("./app/TemaPanel"));
const AppLayout = lazy(() => import("@/app/components/layout/AppLayout/AppLayout"));

// Pages are lazy-loaded (route-level code splitting) so each route ships its own
// chunk instead of bloating the main bundle.
const DashboardPage = lazy(() => import("./app/pages/Dashboard/Dashboard"));
const InicioMedico = lazy(() => import("./app/pages/InicioMedico/InicioMedico"));
const MiPerfil = lazy(() => import("./app/pages/MiPerfil/MiPerfil"));
// Reportes carga Recharts, que pesa: va lazy para no meterlo en el bundle de
// quienes nunca abren la pantalla.
const ReportesPage = lazy(() => import("./app/pages/Reportes/ReportesPage"));
const DoctorsPage = lazy(() => import("./app/pages/DoctorsList/DoctorsList"));
const SocialWorksPage = lazy(() => import("./app/pages/SocialWorkSection/SocialWorkSection"));
const DoctorProfilePage = lazy(() => import("./app/pages/DoctorProfilePage/DoctorProfilePage"));
const PadronPorSocio = lazy(() => import("./app/pages/PadronPorSocio/PadronPorSocio"));
const PadronIoscor = lazy(() => import("./app/pages/PadronIoscor/PadronIoscor"));
const UsersList = lazy(() => import("./app/pages/UsersList/UsersList"));
// Control de calidad del padrón: sólo lectura, señala legajos con problemas.
const AuditoriaPadron = lazy(
  () => import("./app/pages/UsersList/AuditoriaPadron"),
);
const RegisterSocio = lazy(() => import("./app/pages/RegisterSocio/RegisterSocio"));
const PermissionsManager = lazy(() => import("./app/pages/PermissionsManager/PermissionsManager"));
const UsersManagerDashboard = lazy(() => import("./app/pages/UsersManagerDashboard/UsersManagerDashboard"));
const Config = lazy(() => import("./app/pages/Config/Config"));
const Help = lazy(() => import("./app/pages/Help/Help"));
const Login = lazy(() => import("./app/pages/Login/Login"));
const Register = lazy(() => import("./app/pages/Register/Register"));
const AdherenteForm = lazy(() => import("@/app/pages/AdherenteForm/AdherenteForm"));
const ObrasSocialesRegisterPage = lazy(() => import("./app/pages/ObrasSocialesRegisterPage/ObrasSocialesRegisterPage"));
const PadronesPage = lazy(() => import("./app/pages/PadronesPage/PadronesPage"));
const AdminPadrones = lazy(() => import("./app/pages/AdminPadrones/AdminPadrones"));
const AdminPadronesDetail = lazy(() => import("./app/pages/AdminPadronesDetail/AdminPadronesDetail"));
const Boletin = lazy(() => import("./app/pages/Boletin/Boletin"));
const AfiliadosPorObraSocialPage = lazy(() => import("./app/pages/AfiliadosPorObraSocialPage/AfiliadosPorObraSocialPage"));
const GenerarBoletin = lazy(() => import("./app/pages/GenerarBoletin/GenerarBoletin"));
const CambiarPassword = lazy(() => import("./app/pages/CambiarPassword/CambiarPassword"));
const SistemaAnterior = lazy(() => import("./app/pages/SistemaAnterior/SistemaAnterior"));

// Liquidación (nuevo módulo)
const PagosList = lazy(() => import("./app/pages/Pagos/PagosList/PagosList"));
const PagoDetalle = lazy(() => import("./app/pages/Pagos/PagoDetalle/PagoDetalle"));
const FacturaDetalle = lazy(() => import("./app/pages/Pagos/FacturaDetalle/FacturaDetalle"));
const LoteDetalle = lazy(() => import("./app/pages/Pagos/LoteDetalle/LoteDetalle"));
const LoteDetalleSinFactura = lazy(() => import("./app/pages/Pagos/LoteDetalle/LoteDetalleSinFactura"));
const DebitosCreditos = lazy(() => import("./app/pages/Pagos/DebitosCreditos/DebitosCreditos"));
const RefacturacionesList = lazy(() => import("./app/pages/Pagos/RefacturacionesList/RefacturacionesList"));
const DeduccionesList = lazy(() => import("./app/pages/Deducciones/DeduccionesList"));
const NuevaDeduccion = lazy(() => import("./app/pages/Deducciones/NuevaDeduccion"));
const CobranzasPage = lazy(() => import("./app/pages/Cobranzas/CobranzasPage"));

// Facturación (carga de prestaciones del Colegio)
const CargaFacturacion = lazy(() => import("./app/pages/facturacion/CargaFacturacion/CargaFacturacion"));
const CierrePeriodo = lazy(() => import("./app/pages/facturacion/CierrePeriodo/CierrePeriodo"));
const RecalculoPrecios = lazy(() => import("./app/pages/facturacion/RecalculoPrecios/RecalculoPrecios"));
const VerPeriodos = lazy(() => import("./app/pages/facturacion/VerPeriodos/VerPeriodos"));
const Complementarias = lazy(() => import("./app/pages/facturacion/Complementarias/Complementarias"));
const FacturacionFacturaDetalle = lazy(() => import("./app/pages/facturacion/FacturaDetalle/FacturaDetalle"));
const ConsultaPrestacion = lazy(() => import("./app/pages/facturacion/ConsultaPrestacion/ConsultaPrestacion"));
const DetallePorMedico = lazy(() => import("./app/pages/facturacion/DetallePorMedico/DetallePorMedico"));
const RegistroFacturacion = lazy(() => import("./app/pages/facturacion/RegistroFacturacion/RegistroFacturacion"));
const MiRecepcion = lazy(() => import("./app/pages/facturacion/MiRecepcion/MiRecepcion"));

// WEBSITE
const WebRoutes = lazy(() => import("./website/router"));
// El ABM de contenido del sitio. Los componentes siguen en `src/website/`
// porque es funcionalidad del sitio —usan sus clientes y su Button—, pero
// las rutas viven acá para que rendericen dentro del panel y no envueltas
// en el Header, el Footer y el Chatbot de la página pública.
const BoletinMedico = lazy(() => import("./app/pages/BoletinMedico/BoletinMedico"));
const SitioContenido = lazy(() => import("./website/app/admin/dashboard/page"));
const ImportacionesHub = lazy(() => import("./app/pages/Importaciones/ImportacionesHub"));
const ImportarPrevencion = lazy(() => import("./app/pages/Importaciones/ImportarPrevencion"));
const ImportarSwiss = lazy(() => import("./app/pages/Importaciones/ImportarSwiss"));
const ImportarUnne = lazy(() => import("./app/pages/Importaciones/ImportarUnne"));
const BoletinConsultaComun = lazy(() => import("./app/pages/BoletinConsultaComun/BoletinConsultaComun"));
const ObrasSocialesListado = lazy(() => import("./app/pages/ObrasSociales/ObrasSocialesListado/ObrasSocialesListado"));
const ObrasSocialesForm = lazy(() => import("./app/pages/ObrasSociales/ObrasSocialesForm/ObrasSocialesForm"));
const ObrasSocialesDetalle = lazy(() => import("./app/pages/ObrasSociales/ObrasSocialesDetalle/ObrasSocialesDetalle"));
const HistorialValoresConsulta = lazy(() => import("./app/pages/HistorialValoresConsulta/HistorialValoresConsulta"));
const EspecialidadesPage = lazy(() => import("./app/pages/Especialidades/EspecialidadesPage"));
const BeneficiosPage = lazy(() => import("./app/pages/Beneficios/BeneficiosPage"));
const SolicitudesCambioPage = lazy(() => import("./app/pages/SolicitudesCambio/SolicitudesCambioPage"));
const AvisosPage = lazy(() => import("./app/pages/Avisos/AvisosPage"));
const ServiciosPage = lazy(() => import("./app/pages/Servicios/ServiciosPage"));
const TablaGinecologia = lazy(() => import("./app/pages/TablaGinecologia/TablaGinecologia"));
const BoletinGalenos = lazy(() => import("./app/pages/BoletinGalenos/BoletinGalenos"));
const BoletinValoresGalenos = lazy(() => import("./app/pages/BoletinValoresGalenos/BoletinValoresGalenos"));
const ValidacionesHub = lazy(() => import("./app/pages/Validaciones/ValidacionesHub"));
const ValidacionOS = lazy(() => import("./app/pages/Validaciones/ValidacionOS"));
const PortalesExternos = lazy(() => import("./app/pages/Validaciones/PortalesExternos"));
const PrevencionSalud = lazy(() => import("./app/pages/Validaciones/PrevencionSalud"));
const SwissMedical = lazy(() => import("./app/pages/Validaciones/SwissMedical"));
const InstitucionPage = lazy(() => import("./app/pages/Institucion/InstitucionPage"));
const AgendaPage = lazy(() => import("./app/pages/Agenda/AgendaPage"));
const ActividadPage = lazy(() => import("./app/pages/Actividad/ActividadPage"));
const PlanillasMedico = lazy(() => import("./app/pages/Planillas/PlanillasMedico"));
const PlanillasAdmin = lazy(() => import("./app/pages/Planillas/PlanillasAdmin"));
const NomencladorCodigos = lazy(() => import("./app/pages/NomencladorNacional/NomencladorCodigos/NomencladorCodigos"));
const NomencladorCodigoForm = lazy(() => import("./app/pages/NomencladorNacional/NomencladorCodigoForm/NomencladorCodigoForm"));
const NomencladorNacionalTabla = lazy(() => import("./app/pages/NomencladorNacional/NomencladorNacionalTabla/NomencladorNacionalTabla"));
const ConsultaValores = lazy(() => import("./app/pages/NomencladorNacional/ConsultaValores/ConsultaValores"));
const ConsultaPrecios = lazy(() => import("./app/pages/NomencladorNacional/ConsultaPrecios/ConsultaPrecios"));
const Homologador = lazy(() => import("./app/pages/NomencladorNacional/Homologador/Homologador"));
const NomencladorPorOS = lazy(() => import("./app/pages/NomencladorNacional/NomencladorPorOS/NomencladorPorOS"));
const CodigosPorOS = lazy(() => import("./app/pages/NomencladorNacional/CodigosPorOS/CodigosPorOS"));
const NomencladoresNivelados = lazy(() => import("./app/pages/NomencladorNacional/NomencladoresNivelados/NomencladoresNivelados"));

/** La pantalla pasó de /nomenclador/por-obra-social a /nomenclador/precios/por-obra-social. */
function RedirigirValoresPorOS() {
  const { search } = useLocation();
  return <Navigate to={`/panel/nomenclador/precios/por-obra-social${search}`} replace />;
}
// Auditoría: el catálogo de una obra social recortado a una especialidad.
const CodigosPorEspecialidad = lazy(
  () => import("./app/pages/NomencladorNacional/CodigosPorEspecialidad/CodigosPorEspecialidad"),
);
const NomencladorGalenos = lazy(() => import("./app/pages/NomencladorNacional/NomencladorGalenos/NomencladorGalenos"));
const ActualizarPreciosGalenos = lazy(() => import("./app/pages/NomencladorNacional/ActualizarPreciosGalenos/ActualizarPreciosGalenos"));
const CompletarNomencladorNN = lazy(() => import("./app/pages/NomencladorNacional/CompletarNomencladorNN/CompletarNomencladorNN"));
const AgregarCodigoObrasSociales = lazy(() => import("./app/pages/NomencladorNacional/AgregarCodigoObrasSociales/AgregarCodigoObrasSociales"));
const ActualizacionesValores = lazy(() => import("./app/pages/NomencladorNacional/ActualizacionesValores/ActualizacionesValores"));
const ImportarPreciosPdf = lazy(() => import("./app/pages/NomencladorNacional/ImportarPreciosPdf/ImportarPreciosPdf"));
const ImportarValoresFijos = lazy(() => import("./app/pages/NomencladorNacional/ImportarValoresFijos/ImportarValoresFijos"));
const AumentoPorcentual = lazy(() => import("./app/pages/NomencladorNacional/AumentoPorcentual/AumentoPorcentual"));

/** /panel/dashboard: el socio ve su portal, el personal el tablero de siempre. */
function InicioRoute() {
  const { user } = useAuth();
  return isMedico(user) ? <InicioMedico /> : <DashboardPage />;
}

/**
 * /panel/planillas: todos ven las planillas; quien tiene `contenido:editar`
 * recibe la misma lista con el alta, la edición y la baja.
 */
function PlanillasRoute() {
  const { can } = usePermisos();
  return can("contenido:editar") ? <PlanillasAdmin /> : <PlanillasMedico />;
}

export default function RootRoutes() {
  // Edición rápida desde el listado de una factura (ver CapaCarga): la URL es la de la
  // edición pero las rutas se dibujan con la del listado (`fondo`), que queda montado
  // debajo; la capa con el formulario la pone el layout del panel.
  const location = useLocation();
  const fondo = (location.state as EstadoConFondo | null)?.fondo as Location | undefined;
  const edicion = fondo ? matchPath(RUTA_EDICION, location.pathname) : null;
  const rutaCapa = useMemo<RutaCapa | null>(
    () => edicion?.params.id
      ? { editId: edicion.params.id, from: new URLSearchParams(location.search).get("from") }
      : null,
    [edicion?.params.id, location.search],
  );

  return (
    <RutaCapaContext.Provider value={rutaCapa}>
    <AnimatePresence mode="wait">
      <Suspense fallback={<div style={{ padding: 24 }}>Cargando…</div>}>
        <Routes location={rutaCapa && fondo ? fondo : location}>
          <Route element={<TemaPanel />}>
          <Route path="/panel/login" element={<Login />} />
          <Route
            path="/panel/register-os"
            element={<ObrasSocialesRegisterPage />}
          />
          <Route path="/panel/register" element={<Register />} />
          {/* La página de requisitos para asociarse vive en el sitio público
              (`/socios`): es material para quien todavía no es socio. Se deja
              la ruta vieja redirigiendo para no romper enlaces guardados. */}
          <Route path="/panel/info" element={<Navigate to="/socios" replace />} />
          <Route path="/panel/adherente" element={<AdherenteForm />} />
          <Route path="/panel/padrones" element={<PadronesPage />} />
          <Route path="/generar-boletin" element={<GenerarBoletin />} />

          <Route element={<RequireAuth />}>
            <Route path="/panel" element={<AppLayout />}>
              <Route index element={<Navigate to="/panel/dashboard" replace />} />

              {/* Los usuarios médicos solo alcanzan las rutas de MEDICO_ALLOWED_PATHS. */}
              <Route element={<MedicoRouteGuard />}>
              <Route path="dashboard" element={<InicioRoute />} />

              {/* Valores del boletín, sólo lectura. Es la versión de panel del
                  modal «Valores Boletín» del sistema viejo, que el socio abría
                  desde su menú. Va dentro del guard del médico y sin
                  RequireScope: lee los mismos endpoints que ya usa su
                  Consulta de Precios. */}
              <Route path="boletin-valores" element={<BoletinMedico />} />

              <Route element={<RequireScope anyOf={["medico:leer_propio", "medico:leer"]} />}>
                <Route path="mi-perfil" element={<MiPerfil />} />
              </Route>

              {/* Reportes del Colegio: además de esta ruta, el backend exige
                  `reporte:leer` — el guard de acá es sólo comodidad de UI. */}
              <Route element={<RequireScope scope="reporte:leer" />}>
                <Route path="reportes" element={<ReportesPage />} />
              </Route>

              <Route element={<RequireScope scope="medico:leer" />}>
                <Route path="doctors" element={<DoctorsPage />} />
                <Route path="doctors/:id" element={<DoctorProfilePage />} />
                <Route path="padron-socio" element={<PadronPorSocio />} />
              </Route>

              <Route path="social-works" element={<SocialWorksPage />} />

              <Route element={<RequireScope scope="padron:leer" />}>
                <Route
                  path="afiliadospadron"
                  element={<AfiliadosPorObraSocialPage />}
                />
              </Route>

              {/* Liquidación */}
              <Route element={<RequireScope scope="pago:leer" />}>
                <Route path="liquidation" element={<PagosList />} />
                <Route path="liquidation/:pagoId" element={<PagoDetalle />} />
                <Route
                  path="liquidation/:pagoId/facturas/:liquidacionId"
                  element={<FacturaDetalle />}
                />
              </Route>

              {/* Débitos y Créditos + Refacturaciones (independientes) */}
              <Route element={<RequireScope scope="lote:leer" />}>
                <Route path="debitos-creditos" element={<DebitosCreditos />} />
                <Route path="debitos-creditos/:loteId" element={<LoteDetalle />} />
                <Route
                  path="debitos-creditos-sin-factura/:loteId"
                  element={<LoteDetalleSinFactura />}
                />
                <Route path="refacturaciones" element={<RefacturacionesList />} />
                <Route path="refacturaciones/:loteId" element={<LoteDetalle />} />
              </Route>

              <Route element={<RequireScope scope="deduccion:leer" />}>
                <Route path="deducciones" element={<DeduccionesList />} />
              </Route>
              <Route element={<RequireScope scope="deduccion:crear" />}>
                <Route path="deducciones/nueva" element={<NuevaDeduccion />} />
              </Route>

              {/* Facturación */}
              <Route path="facturacion">
                <Route index element={<Navigate to="/panel/facturacion/periodos" replace />} />
                <Route element={<RequireScope scope="facturacion:cargar" />}>
                  <Route path="carga" element={<CargaFacturacion />} />
                  <Route path="carga/:id" element={<CargaFacturacion />} />
                </Route>
                <Route element={<RequireScope scope="facturacion:cerrar" />}>
                  <Route path="cierre" element={<CierrePeriodo />} />
                </Route>
                <Route element={<RequireScope scope="facturacion:periodo" />}>
                  <Route path="recalculo" element={<RecalculoPrecios />} />
                </Route>
                <Route element={<RequireScope scope="facturacion:leer" />}>
                  <Route path="periodos" element={<VerPeriodos />} />
                  <Route path="periodos/:id" element={<FacturacionFacturaDetalle />} />
                  <Route path="consulta" element={<ConsultaPrestacion />} />
                  <Route path="consulta/:id" element={<ConsultaPrestacion />} />
                  <Route path="detalle-medico" element={<DetallePorMedico />} />
                </Route>
                <Route element={<RequireScope scope="facturacion:leer_propio" />}>
                  <Route path="mi-recepcion" element={<MiRecepcion />} />
                </Route>
                <Route element={<RequireScope scope="facturacion:complementar" />}>
                  <Route path="complementarias" element={<Complementarias />} />
                  <Route path="complementarias/:facturaId/cargar" element={<CargaFacturacion />} />
                </Route>
                <Route element={<RequireScope scope="facturacion:registro" />}>
                  <Route path="registro" element={<RegistroFacturacion />} />
                </Route>
              </Route>

              <Route element={<RequireScope scope="padron:leer" />}>
                <Route path="padron-ioscor" element={<PadronIoscor />} />
              </Route>

              <Route element={<RequireScope scope="medico:leer" />}>
                <Route path="users" element={<UsersList />} />
                <Route path="users/auditoria" element={<AuditoriaPadron />} />
                <Route path="users-manager" element={<UsersManagerDashboard />} />
              </Route>

              <Route element={<RequireScope scope="medico:crear" />}>
                <Route path="register-socio" element={<RegisterSocio />} />
              </Route>

              <Route element={<RequireScope scope="cobranza:leer" />}>
                <Route path="cobranzas" element={<CobranzasPage />} />
              </Route>

              {/* Contenido del sitio público: noticias, cursos, valores éticos y
                  avisos de médicos. `RequireWebEditor` acepta el rol editor_web
                  o `contenido:editar`, que es lo que el backend ya exige. */}
              <Route element={<RequireWebEditor />}>
                <Route path="sitio" element={<SitioContenido />} />
                {/* La solapa vive dentro de la pantalla; la dirección vieja
                    del sitio sigue funcionando y cae en ella. */}
                <Route
                  path="sitio/medicos-promo"
                  element={<Navigate to="/panel/sitio?tab=promo" replace />}
                />
              </Route>

              <Route element={<RequireScope scope="rbac:gestionar" />}>
                <Route path="admin/permissions" element={<PermissionsManager />} />
                {/* Registro de acciones del personal. Va con `rbac:gestionar`
                    —el mismo criterio que `auditoria:leer`, que es de admin—
                    porque muestra qué hizo cada empleado. Todavía sin backend:
                    la pantalla avisa que los datos son de ejemplo. */}
                <Route path="actividad" element={<ActividadPage />} />
              </Route>

              <Route path="config" element={<Config />} />
              <Route path="help" element={<Help />} />

              <Route element={<RequireScope scope="nomenclador:leer" />}>
                <Route path="boletin" element={<Boletin />} />
                <Route
                  path="historial-valores"
                  element={<HistorialValoresConsulta />}
                />
                <Route
                  path="tabla-ginecologia"
                  element={<TablaGinecologia />}
                />
                <Route
                  path="boletin-galenos"
                  element={<BoletinGalenos />}
                />
                {/* Los valores de galeno del boletín, para el Colegio: se
                    elige un valor y se comparan todas las obras sociales.
                    `boletin-galenos` es otra cosa: el formulario de carga,
                    todavía sin backend. */}
                <Route
                  path="boletin-valores-galenos"
                  element={<BoletinValoresGalenos />}
                />
              </Route>

              <Route element={<RequireScope scope="catalogo:leer" />}>
                <Route
                  path="boletin-consulta-comun"
                  element={<BoletinConsultaComun />}
                />
              </Route>

              {/* Importaciones masivas: obras sociales que mandan un reporte
                  mensual en vez de validar prestación por prestación. Es carga
                  del Colegio en nombre de terceros, así que va con el mismo
                  permiso que la carga manual. Queda fuera de
                  MEDICO_ALLOWED_PATHS, que es lista blanca: el socio no llega
                  ni por URL. */}
              <Route element={<RequireScope scope="facturacion:cargar" />}>
                <Route path="importaciones" element={<ImportacionesHub />} />
                <Route
                  path="importaciones/prevencion"
                  element={<ImportarPrevencion />}
                />
                <Route path="importaciones/swiss" element={<ImportarSwiss />} />
                <Route path="importaciones/unne" element={<ImportarUnne />} />
              </Route>

              {/* Validaciones con obras sociales */}
              <Route element={<RequireScope scope="validacion:cargar" />}>
                <Route path="validaciones" element={<ValidacionesHub />} />
                {/* Ruta estática antes de la dinámica: "portales" no es un slug de O.S. */}
                <Route path="validaciones/portales" element={<PortalesExternos />} />
                <Route
                  path="validaciones/prevencion-salud"
                  element={<PrevencionSalud />}
                />
                <Route
                  path="validaciones/swiss-medical"
                  element={<SwissMedical />}
                />
                <Route path="validaciones/:slug" element={<ValidacionOS />} />
              </Route>

              {/* Planillas de consulta: todos las descargan, el Colegio las publica. */}
              <Route path="planillas" element={<PlanillasRoute />} />
              {/* La pantalla de publicación sube y borra planillas: el backend
                  exige `contenido:editar` en POST y DELETE (authz.py), así que
                  la ruta pide lo mismo. Sin el guard, quien no tenía el permiso
                  no veía el ítem en el menú pero llegaba igual por la URL y se
                  encontraba con el formulario de carga. */}
              <Route element={<RequireScope scope="contenido:editar" />}>
                <Route path="convenios/planillas" element={<PlanillasAdmin />} />
              </Route>

              {/* Nomenclador Nacional */}
              <Route element={<RequireScope scope="nomenclador:leer" />}>
                <Route path="nomenclador/codigos" element={<NomencladorCodigos />} />
                <Route path="nomenclador/nacional" element={<NomencladorNacionalTabla />} />
                <Route path="nomenclador/nivelados/:slug?" element={<NomencladoresNivelados />} />
                <Route path="nomenclador/precios/por-obra-social" element={<NomencladorPorOS />} />
                {/* Dirección vieja: redirige conservando ?os=…&codigo=… */}
                <Route path="nomenclador/por-obra-social" element={<RedirigirValoresPorOS />} />
                <Route path="nomenclador/codigos-por-os" element={<CodigosPorOS />} />
                <Route path="nomenclador/por-especialidad" element={<CodigosPorEspecialidad />} />
                <Route path="nomenclador/galenos" element={<NomencladorGalenos />} />
                <Route path="nomenclador/consulta-valores" element={<ConsultaValores />} />
                <Route path="nomenclador/consulta-precios" element={<ConsultaPrecios />} />
                <Route path="nomenclador/homologador" element={<Homologador />} />
                <Route path="nomenclador/actualizaciones" element={<ActualizacionesValores />} />
              </Route>
              <Route element={<RequireScope scope="nomenclador:masivo" />}>
                <Route path="nomenclador/importar-precios-pdf" element={<ImportarPreciosPdf />} />
                <Route path="nomenclador/importar-valores-fijos" element={<ImportarValoresFijos />} />
                <Route path="nomenclador/aumento-porcentual" element={<AumentoPorcentual />} />
                <Route path="herramientas/completar-nomenclador-nn" element={<CompletarNomencladorNN />} />
                <Route path="herramientas/agregar-codigo-obras-sociales" element={<AgregarCodigoObrasSociales />} />
              </Route>
              <Route element={<RequireScope scope="nomenclador:editar" />}>
                <Route path="nomenclador/codigos/nuevo" element={<NomencladorCodigoForm />} />
                <Route path="nomenclador/codigos/:id/editar" element={<NomencladorCodigoForm />} />
                <Route path="nomenclador/actualizar-precios" element={<ActualizarPreciosGalenos />} />
              </Route>

              <Route element={<RequireScope scope="catalogo:leer" />}>
                <Route path="especialidades" element={<EspecialidadesPage />} />
                {/* Datos del propio Colegio y los tres calendarios. El guard
                    de acá es comodidad de UI; el backend exige lo mismo, y las
                    contraseñas de las casillas además `rbac:gestionar`. */}
                <Route path="institucion" element={<InstitucionPage />} />
                <Route path="agenda" element={<AgendaPage />} />
              </Route>
              <Route element={<RequireScope scope="medico:leer" />}>
                <Route path="servicios" element={<ServiciosPage />} />
              </Route>
              <Route element={<RequireScope scope="beneficio:gestionar" />}>
                <Route path="beneficios" element={<BeneficiosPage />} />
              </Route>
              <Route element={<RequireScope scope="aviso:gestionar" />}>
                <Route path="avisos" element={<AvisosPage />} />
              </Route>
              <Route element={<RequireScope scope="solicitud:leer" />}>
                <Route
                  path="solicitudes-cambio"
                  element={<SolicitudesCambioPage />}
                />
              </Route>

              <Route path="convenios/obras-sociales">
                <Route element={<RequireScope scope="catalogo:leer" />}>
                  <Route index element={<ObrasSocialesListado />} />
                  <Route path=":id" element={<ObrasSocialesDetalle />} />
                </Route>
                <Route element={<RequireScope scope="catalogo:editar" />}>
                  <Route path="alta" element={<ObrasSocialesForm />} />
                  <Route path=":id/editar" element={<ObrasSocialesForm />} />
                </Route>
              </Route>

              <Route
                path="*"
                element={<Navigate to="/panel/dashboard" replace />}
              />
              </Route>
            </Route>

            <Route element={<RequireScope scope="padron:leer" />}>
              <Route path="/panel/admin-padrones" element={<AdminPadrones />} />
              <Route
                path="/panel/admin-padrones-detail"
                element={<AdminPadronesDetail />}
              />
            </Route>
            <Route
              path="/panel/cambiar-password"
              element={<CambiarPassword />}
            />
            <Route path="/panel/sistema-anterior" element={<SistemaAnterior />} />
          </Route>
          </Route>

          <Route path="/*" element={<WebRoutes />} />
        </Routes>
      </Suspense>
    </AnimatePresence>
    </RutaCapaContext.Provider>
  );
}
