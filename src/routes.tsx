import { Suspense, lazy } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { AnimatePresence } from "framer-motion";

// Structural components are always needed for the panel shell → keep eager.
import RequireAuth from "./app/auth/RequireAuth";
import MedicoRouteGuard from "./app/auth/MedicoRouteGuard";
import RequireScope from "./app/auth/RequireScope";
import AppLayout from "./app/components/molecules/AppLayout/AppLayout";
import { useAuth } from "./app/auth/AuthProvider";
import { isMedico } from "./app/auth/roles";

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
const Info = lazy(() => import("./app/pages/Info/Info"));
const AdherenteForm = lazy(() => import("./app/components/molecules/AdherenteForm/AdherenteForm"));
const ObrasSocialesRegisterPage = lazy(() => import("./app/pages/ObrasSocialesRegisterPage/ObrasSocialesRegisterPage"));
const PadronesPage = lazy(() => import("./app/pages/PadronesPage/PadronesPage"));
const AdminPadrones = lazy(() => import("./app/pages/AdminPadrones/AdminPadrones"));
const AdminPadronesDetail = lazy(() => import("./app/pages/AdminPadronesDetail/AdminPadronesDetail"));
const Boletin = lazy(() => import("./app/pages/Boletin/Boletin"));
const AfiliadosPorObraSocialPage = lazy(() => import("./app/pages/AfiliadosPorObraSocialPage/AfiliadosPorObraSocialPage"));
const GenerarBoletin = lazy(() => import("./app/pages/GenerarBoletin/GenerarBoletin"));
const CambiarPassword = lazy(() => import("./app/pages/CambiarPassword/CambiarPassword"));

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
const VerPeriodos = lazy(() => import("./app/pages/facturacion/VerPeriodos/VerPeriodos"));
const Complementarias = lazy(() => import("./app/pages/facturacion/Complementarias/Complementarias"));
const FacturacionFacturaDetalle = lazy(() => import("./app/pages/facturacion/FacturaDetalle/FacturaDetalle"));
const ConsultaPrestacion = lazy(() => import("./app/pages/facturacion/ConsultaPrestacion/ConsultaPrestacion"));
const DetallePorMedico = lazy(() => import("./app/pages/facturacion/DetallePorMedico/DetallePorMedico"));
const RegistroFacturacion = lazy(() => import("./app/pages/facturacion/RegistroFacturacion/RegistroFacturacion"));
const MiRecepcion = lazy(() => import("./app/pages/facturacion/MiRecepcion/MiRecepcion"));

// WEBSITE
const WebRoutes = lazy(() => import("./website/router"));
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
const ValidacionesHub = lazy(() => import("./app/pages/Validaciones/ValidacionesHub"));
const ValidacionOS = lazy(() => import("./app/pages/Validaciones/ValidacionOS"));
const PortalesExternos = lazy(() => import("./app/pages/Validaciones/PortalesExternos"));
const PrevencionSalud = lazy(() => import("./app/pages/Validaciones/PrevencionSalud"));
const InstitucionPage = lazy(() => import("./app/pages/Institucion/InstitucionPage"));
const AgendaPage = lazy(() => import("./app/pages/Agenda/AgendaPage"));
const ActividadPage = lazy(() => import("./app/pages/Actividad/ActividadPage"));
const PlanillasMedico = lazy(() => import("./app/pages/Planillas/PlanillasMedico"));
const PlanillasAdmin = lazy(() => import("./app/pages/Planillas/PlanillasAdmin"));
const NomencladorCodigos = lazy(() => import("./app/pages/NomencladorNacional/NomencladorCodigos/NomencladorCodigos"));
const ConsultaValores = lazy(() => import("./app/pages/NomencladorNacional/ConsultaValores/ConsultaValores"));
const ConsultaPrecios = lazy(() => import("./app/pages/NomencladorNacional/ConsultaPrecios/ConsultaPrecios"));
const Homologador = lazy(() => import("./app/pages/NomencladorNacional/Homologador/Homologador"));
const NomencladorPorOS = lazy(() => import("./app/pages/NomencladorNacional/NomencladorPorOS/NomencladorPorOS"));
// Auditoría: el catálogo de una obra social recortado a una especialidad.
const CodigosPorEspecialidad = lazy(
  () => import("./app/pages/NomencladorNacional/CodigosPorEspecialidad/CodigosPorEspecialidad"),
);
const NomencladorGalenos = lazy(() => import("./app/pages/NomencladorNacional/NomencladorGalenos/NomencladorGalenos"));
const ActualizarPreciosGalenos = lazy(() => import("./app/pages/NomencladorNacional/ActualizarPreciosGalenos/ActualizarPreciosGalenos"));
const ActualizacionesValores = lazy(() => import("./app/pages/NomencladorNacional/ActualizacionesValores/ActualizacionesValores"));
const ImportarPreciosPdf = lazy(() => import("./app/pages/NomencladorNacional/ImportarPreciosPdf/ImportarPreciosPdf"));
const AumentoPorcentual = lazy(() => import("./app/pages/NomencladorNacional/AumentoPorcentual/AumentoPorcentual"));

/** /panel/dashboard: el socio ve su portal, el personal el tablero de siempre. */
function InicioRoute() {
  const { user } = useAuth();
  return isMedico(user) ? <InicioMedico /> : <DashboardPage />;
}

export default function RootRoutes() {
  return (
    <AnimatePresence mode="wait">
      <Suspense fallback={<div style={{ padding: 24 }}>Cargando…</div>}>
        <Routes>
          <Route path="/panel/login" element={<Login />} />
          <Route
            path="/panel/register-os"
            element={<ObrasSocialesRegisterPage />}
          />
          <Route path="/panel/register" element={<Register />} />
          <Route path="/panel/info" element={<Info />} />
          <Route path="/panel/adherente" element={<AdherenteForm />} />
          <Route path="/panel/padrones" element={<PadronesPage />} />
          <Route path="/generar-boletin" element={<GenerarBoletin />} />

          <Route element={<RequireAuth />}>
            <Route path="/panel" element={<AppLayout />}>
              <Route index element={<Navigate to="/panel/dashboard" replace />} />

              {/* Los usuarios médicos solo alcanzan las rutas de MEDICO_ALLOWED_PATHS. */}
              <Route element={<MedicoRouteGuard />}>
              <Route path="dashboard" element={<InicioRoute />} />

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
              </Route>

              <Route element={<RequireScope scope="catalogo:leer" />}>
                <Route
                  path="boletin-consulta-comun"
                  element={<BoletinConsultaComun />}
                />
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
                <Route path="validaciones/:slug" element={<ValidacionOS />} />
              </Route>

              {/* Planillas de consulta: el médico las descarga, el Colegio las publica. */}
              <Route path="planillas" element={<PlanillasMedico />} />
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
                <Route path="nomenclador/por-obra-social" element={<NomencladorPorOS />} />
                <Route path="nomenclador/por-especialidad" element={<CodigosPorEspecialidad />} />
                <Route path="nomenclador/galenos" element={<NomencladorGalenos />} />
                <Route path="nomenclador/consulta-valores" element={<ConsultaValores />} />
                <Route path="nomenclador/consulta-precios" element={<ConsultaPrecios />} />
                <Route path="nomenclador/homologador" element={<Homologador />} />
                <Route path="nomenclador/actualizaciones" element={<ActualizacionesValores />} />
              </Route>
              <Route element={<RequireScope scope="nomenclador:masivo" />}>
                <Route path="nomenclador/importar-precios-pdf" element={<ImportarPreciosPdf />} />
                <Route path="nomenclador/aumento-porcentual" element={<AumentoPorcentual />} />
              </Route>
              <Route element={<RequireScope scope="nomenclador:editar" />}>
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
          </Route>

          <Route path="/*" element={<WebRoutes />} />
        </Routes>
      </Suspense>
    </AnimatePresence>
  );
}
