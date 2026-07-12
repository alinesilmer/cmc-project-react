import { Suspense, lazy } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { AnimatePresence } from "framer-motion";

// Structural components are always needed for the panel shell → keep eager.
import RequireAuth from "./app/auth/RequireAuth";
import AppLayout from "./app/components/molecules/AppLayout/AppLayout";

// Pages are lazy-loaded (route-level code splitting) so each route ships its own
// chunk instead of bloating the main bundle.
const DashboardPage = lazy(() => import("./app/pages/Dashboard/Dashboard"));
const DoctorsPage = lazy(() => import("./app/pages/DoctorsList/DoctorsList"));
const SocialWorksPage = lazy(() => import("./app/pages/SocialWorkSection/SocialWorkSection"));
const DoctorProfilePage = lazy(() => import("./app/pages/DoctorProfilePage/DoctorProfilePage"));
const PadronIoscor = lazy(() => import("./app/pages/PadronIoscor/PadronIoscor"));
const UsersList = lazy(() => import("./app/pages/UsersList/UsersList"));
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

// Facturación (carga de prestaciones del Colegio)
const Facturacion = lazy(() => import("./app/pages/facturacion/Facturacion"));
const CargaFacturacion = lazy(() => import("./app/pages/facturacion/CargaFacturacion/CargaFacturacion"));
const ListadoPrestaciones = lazy(() => import("./app/pages/facturacion/ListadoPrestaciones/ListadoPrestaciones"));
const CierrePeriodo = lazy(() => import("./app/pages/facturacion/CierrePeriodo/CierrePeriodo"));

// WEBSITE
const WebRoutes = lazy(() => import("./website/router"));
const BoletinConsultaComun = lazy(() => import("./app/pages/BoletinConsultaComun/BoletinConsultaComun"));
const ObrasSocialesListado = lazy(() => import("./app/pages/ObrasSociales/ObrasSocialesListado/ObrasSocialesListado"));
const ObrasSocialesForm = lazy(() => import("./app/pages/ObrasSociales/ObrasSocialesForm/ObrasSocialesForm"));
const ObrasSocialesDetalle = lazy(() => import("./app/pages/ObrasSociales/ObrasSocialesDetalle/ObrasSocialesDetalle"));
const HistorialValoresConsulta = lazy(() => import("./app/pages/HistorialValoresConsulta/HistorialValoresConsulta"));
const EspecialidadesPage = lazy(() => import("./app/pages/Especialidades/EspecialidadesPage"));
const ServiciosPage = lazy(() => import("./app/pages/Servicios/ServiciosPage"));
const TablaGinecologia = lazy(() => import("./app/pages/TablaGinecologia/TablaGinecologia"));
const BoletinGalenos = lazy(() => import("./app/pages/BoletinGalenos/BoletinGalenos"));
const NomencladorCodigos = lazy(() => import("./app/pages/NomencladorNacional/NomencladorCodigos/NomencladorCodigos"));
const ConsultaValores = lazy(() => import("./app/pages/NomencladorNacional/ConsultaValores/ConsultaValores"));
const ConsultaPrecios = lazy(() => import("./app/pages/NomencladorNacional/ConsultaPrecios/ConsultaPrecios"));
const Homologador = lazy(() => import("./app/pages/NomencladorNacional/Homologador/Homologador"));
const NomencladorPorOS = lazy(() => import("./app/pages/NomencladorNacional/NomencladorPorOS/NomencladorPorOS"));
const NomencladorGalenos = lazy(() => import("./app/pages/NomencladorNacional/NomencladorGalenos/NomencladorGalenos"));
const ActualizarPreciosGalenos = lazy(() => import("./app/pages/NomencladorNacional/ActualizarPreciosGalenos/ActualizarPreciosGalenos"));
const ImportarPreciosPdf = lazy(() => import("./app/pages/NomencladorNacional/ImportarPreciosPdf/ImportarPreciosPdf"));
const AumentoPorcentual = lazy(() => import("./app/pages/NomencladorNacional/AumentoPorcentual/AumentoPorcentual"));

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

              <Route path="dashboard" element={<DashboardPage />} />
              <Route path="doctors" element={<DoctorsPage />} />
              <Route path="doctors/:id" element={<DoctorProfilePage />} />
              <Route path="social-works" element={<SocialWorksPage />} />
              <Route
                path="afiliadospadron"
                element={<AfiliadosPorObraSocialPage />}
              />

              {/* Liquidación */}
              <Route path="liquidation" element={<PagosList />} />
              <Route path="liquidation/:pagoId" element={<PagoDetalle />} />
              <Route
                path="liquidation/:pagoId/facturas/:liquidacionId"
                element={<FacturaDetalle />}
              />

              {/* Débitos y Créditos (independiente) */}
              <Route path="debitos-creditos" element={<DebitosCreditos />} />
              <Route path="debitos-creditos/:loteId" element={<LoteDetalle />} />
              <Route
                path="debitos-creditos-sin-factura/:loteId"
                element={<LoteDetalleSinFactura />}
              />

              {/* Refacturaciones (independiente) */}
              <Route path="refacturaciones" element={<RefacturacionesList />} />
              <Route path="refacturaciones/:loteId" element={<LoteDetalle />} />
              <Route path="deducciones" element={<DeduccionesList />} />
              <Route path="deducciones/nueva" element={<NuevaDeduccion />} />

              {/* Facturación */}
              <Route path="facturacion">
                <Route index element={<Facturacion />} />
                <Route path="carga" element={<CargaFacturacion />} />
                <Route path="prestaciones" element={<ListadoPrestaciones />} />
                <Route path="cierre" element={<CierrePeriodo />} />
              </Route>

              <Route path="padron-ioscor" element={<PadronIoscor />} />
              <Route path="users" element={<UsersList />} />
              <Route path="register-socio" element={<RegisterSocio />} />
              <Route path="admin/permissions" element={<PermissionsManager />} />
              <Route path="users-manager" element={<UsersManagerDashboard />} />
              <Route path="boletin" element={<Boletin />} />
              <Route path="config" element={<Config />} />
              <Route path="help" element={<Help />} />
              <Route
                path="boletin-consulta-comun"
                element={<BoletinConsultaComun />}
              />
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
              {/* Nomenclador Nacional */}
              <Route path="nomenclador/codigos" element={<NomencladorCodigos />} />
              <Route path="nomenclador/por-obra-social" element={<NomencladorPorOS />} />
              <Route path="nomenclador/galenos" element={<NomencladorGalenos />} />
              <Route path="nomenclador/actualizar-precios" element={<ActualizarPreciosGalenos />} />
              <Route path="nomenclador/consulta-valores" element={<ConsultaValores />} />
              <Route path="nomenclador/consulta-precios" element={<ConsultaPrecios />} />
              <Route path="nomenclador/importar-precios-pdf" element={<ImportarPreciosPdf />} />
              <Route path="nomenclador/aumento-porcentual" element={<AumentoPorcentual />} />
              <Route path="nomenclador/homologador" element={<Homologador />} />

              <Route path="especialidades" element={<EspecialidadesPage />} />
              <Route path="servicios" element={<ServiciosPage />} />

              <Route path="convenios/obras-sociales">
                <Route index element={<ObrasSocialesListado />} />
                <Route path="alta" element={<ObrasSocialesForm />} />
                <Route path=":id" element={<ObrasSocialesDetalle />} />
                <Route path=":id/editar" element={<ObrasSocialesForm />} />
              </Route>

              <Route
                path="*"
                element={<Navigate to="/panel/dashboard" replace />}
              />
            </Route>

            <Route path="/panel/admin-padrones" element={<AdminPadrones />} />
            <Route
              path="/panel/admin-padrones-detail"
              element={<AdminPadronesDetail />}
            />
          </Route>

          <Route path="/*" element={<WebRoutes />} />
        </Routes>
      </Suspense>
    </AnimatePresence>
  );
}
