import { Suspense, lazy, useEffect } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";

const Home = lazy(() => import("./app/inicio/page"));
const Contacto = lazy(() => import("./app/contact/page"));
const NoticiasPage = lazy(() => import("./app/noticias/page"));
const NoticiaDetail = lazy(() => import("./app/noticias/[id]/page"));
const AdminLogin = lazy(() => import("./app/admin/login/page"));
const AdminDashboard = lazy(() => import("./app/admin/dashboard/page"));
import Header from "./components/UI/Header/Header";
import Footer from "./components/UI/Footer/Footer";
import NosotrosPage from "./app/nosotros/page";
import AdminMedicosPromo from "./app/admin/MedicosPromo/MedicosPromo";
import Servicios from "./app/servicios/page";
import NotFound from "./app/notFound/notFound";
import GaleriaPage from "./app/galeria/page";
import ConveniosPage from "./app/convenios/convenios";
import QuintaPage from "./app/quinta/quinta";

function ScrollToTop() {
  const { pathname, hash } = useLocation();
  useEffect(() => {
    if (hash) return;            
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [pathname, hash]);
  return null;
}

export default function WebRoutes() {
  return (
    <Suspense fallback={<div style={{ padding: 24 }}>Cargando…</div>}>
      <Header />
      <ScrollToTop />

      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/contacto" element={<Contacto />} />
        <Route path="/noticias" element={<NoticiasPage />} />
        <Route path="/noticias/:id" element={<NoticiaDetail />} />
        <Route path="/nosotros" element={<NosotrosPage />} />
        <Route path="/servicios" element={<Servicios />} />
        <Route path="/notFound" element={<NotFound />} />


         <Route path="/galeria" element={<GaleriaPage />} />
         <Route path="/convenios" element={<ConveniosPage />} />
         <Route path="/quinta" element={<QuintaPage />} />

        {/* Admin */}
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/admin/dashboard" element={<AdminDashboard />} />
        <Route path="/admin/medicos-promo" element={<AdminMedicosPromo />} />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      <Footer />
    </Suspense>
  );
}
