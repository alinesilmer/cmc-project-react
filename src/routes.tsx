import { Routes, Route, Navigate } from "react-router-dom";
import { AnimatePresence } from "framer-motion";

// APP
import RequireAuth from "./app/auth/RequireAuth";
import AppLayout from "./app/components/molecules/AppLayout/AppLayout";
import DashboardPage from "./app/pages/Dashboard/Dashboard";
import DoctorsPage from "./app/pages/DoctorsList/DoctorsList";
import SocialWorksPage from "./app/pages/SocialWorkSection/SocialWorkSection";
import DoctorProfilePage from "./app/pages/DoctorProfilePage/DoctorProfilePage";
import PadronIoscor from "./app/pages/PadronIoscor/PadronIoscor";
import ApplicationsList from "./app/components/molecules/ApplicationsList/ApplicationsList";
import ApplicationDetail from "./app/components/molecules/ApplicationDetail/ApplicationDetail";
import UsersList from "./app/pages/UsersList/UsersList";
import RegisterSocio from "./app/pages/RegisterSocio/RegisterSocio";
import PermissionsManager from "./app/pages/PermissionsManager/PermissionsManager";
import UsersManagerDashboard from "./app/pages/UsersManagerDashboard/UsersManagerDashboard";
import Config from "./app/pages/Config/Config";
import PadronSucio from "./app/pages/PadronSucio/PadronSucio";
import Help from "./app/pages/Help/Help";
import Login from "./app/pages/Login/Login";
import Register from "./app/pages/Register/Register";
import Info from "./app/pages/Info/Info";
import AdherenteForm from "./app/components/molecules/AdherenteForm/AdherenteForm";
import ObrasSocialesRegisterPage from "./app/pages/ObrasSocialesRegisterPage/ObrasSocialesRegisterPage";
import PadronesPage from "./app/pages/PadronesPage/PadronesPage";
import AdminPadrones from "./app/pages/AdminPadrones/AdminPadrones";
import AdminPadronesDetail from "./app/pages/AdminPadronesDetail/AdminPadronesDetail";
import Boletin from "./app/pages/Boletin/Boletin";
import AfiliadosPorObraSocialPage from "./app/pages/AfiliadosPorObraSocialPage/AfiliadosPorObraSocialPage";
import GenerarBoletin from "./app/pages/GenerarBoletin/GenerarBoletin";
import CrearPadron from "./app/pages/CrearPadron/CrearPadron";

// Liquidación (nuevo módulo)
import PagosList from "./app/pages/Pagos/PagosList/PagosList";
import PagoDetalle from "./app/pages/Pagos/PagoDetalle/PagoDetalle";
import FacturaDetalle from "./app/pages/Pagos/FacturaDetalle/FacturaDetalle";
import LoteDetalle from "./app/pages/Pagos/LoteDetalle/LoteDetalle";
import LoteDetalleSinFactura from "./app/pages/Pagos/LoteDetalle/LoteDetalleSinFactura";
import DebitosCreditos from "./app/pages/Pagos/DebitosCreditos/DebitosCreditos";
import RefacturacionesList from "./app/pages/Pagos/RefacturacionesList/RefacturacionesList";
import DeduccionesList from "./app/pages/Deducciones/DeduccionesList";
import NuevaDeduccion from "./app/pages/Deducciones/NuevaDeduccion";

// Facturación
import Facturacion from "./app/pages/facturacion/Facturacion";
import CargaFacturacion from "./app/pages/facturacion/CargaFacturacion/CargaFacturacion";
import CierrePeriodoFacturista from "./app/pages/facturacion/CierrePeriodoFacturista/CierrePeriodoFacturista";
import ListadoOSFacturacion from "./app/pages/facturacion/ListadoOSFacturacion/ListadoOSFacturacion";

// WEBSITE
import WebRoutes from "./website/router";
import GenerarExcel from "./app/pages/CrearPadronExcel/CrearPadronExcel";
import BoletinConsultaComun from "./app/pages/BoletinConsultaComun/BoletinConsultaComun";
import PadronSwiss from "./app/pages/PadronSwiss/PadronSwiss";
import ObrasSocialesListado from "./app/pages/ObrasSociales/ObrasSocialesListado/ObrasSocialesListado";
import ObrasSocialesForm from "./app/pages/ObrasSociales/ObrasSocialesForm/ObrasSocialesForm";
import ObrasSocialesDetalle from "./app/pages/ObrasSociales/ObrasSocialesDetalle/ObrasSocialesDetalle";
import EspecialidadesPage from "./app/pages/Especialidades/EspecialidadesPage";

export default function RootRoutes() {
  return (
    <AnimatePresence mode="wait">
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
            <Route path="padronsucio" element={<PadronSucio />} />
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

            <Route path="padron-ioscor" element={<PadronIoscor />} />
            <Route path="solicitudes" element={<ApplicationsList />} />
            <Route path="solicitudes/:id" element={<ApplicationDetail />} />
            <Route path="users" element={<UsersList />} />
            <Route path="register-socio" element={<RegisterSocio />} />
            <Route path="admin/permissions" element={<PermissionsManager />} />
            <Route path="users-manager" element={<UsersManagerDashboard />} />
            <Route path="boletin" element={<Boletin />} />
            <Route path="config" element={<Config />} />
            <Route path="help" element={<Help />} />
            <Route path="crear-padron" element={<CrearPadron />} />
            <Route path="crear-excel" element={<GenerarExcel />} />
            <Route path="padron-swiss" element={<PadronSwiss />} />
            <Route
              path="boletin-consulta-comun"
              element={<BoletinConsultaComun />}
            />

            <Route path="especialidades" element={<EspecialidadesPage />} />

            <Route path="convenios/obras-sociales">
              <Route index element={<ObrasSocialesListado />} />
              <Route path="alta" element={<ObrasSocialesForm />} />
              <Route path=":id" element={<ObrasSocialesDetalle />} />
              <Route path=":id/editar" element={<ObrasSocialesForm />} />
            </Route>

            <Route path="facturacion">
              <Route index element={<Facturacion />} />
              <Route path="carga" element={<CargaFacturacion />} />
              <Route
                path="cierre-periodo"
                element={<CierrePeriodoFacturista />}
              />
              <Route
                path="listado-por-obra-social"
                element={<ListadoOSFacturacion />}
              />
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
    </AnimatePresence>
  );
}
