import { Suspense, lazy, useEffect } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import "./styles/escala.css";

const Home = lazy(() => import("./app/inicio/page"));
const Contacto = lazy(() => import("./app/contact/page"));
const NoticiasPage = lazy(() => import("./app/noticias/page"));
const BeneficiosPage = lazy(() => import("./app/beneficios/page"));
const NoticiaDetail = lazy(() => import("./app/noticias/[id]/page"));
const Forbidden403 = lazy(() => import("./app/forbidden403/Forbidden403"));
const SociosPage = lazy(() => import("./app/socios/page"));
const NosotrosPage = lazy(() => import("./app/nosotros/page"));
const Servicios = lazy(() => import("./app/servicios/page"));
const ConveniosPage = lazy(() => import("./app/convenios/convenios"));
const QuintaPage = lazy(() => import("./app/quinta/quinta"));
const CursosPage = lazy(() => import("./app/cursoscap/page"));
const CursoDetailPage = lazy(() => import("./app/cursoscap/[id]/page"));
const SegurosPage = lazy(() => import("./app/seguros/page"));
const Asociados = lazy(() => import("./app/asociados/page"));
const PrevencionSaludPage = lazy(() => import("./app/prevencion-salud/page"));
const PreguntasFrecuentesPage = lazy(() => import("./app/preguntas-frecuentes/page"));

import Header from "./components/UI/Header/Header";
import Footer from "./components/UI/Footer/Footer";
import Chatbot from "./components/Chatbot/Chatbot";

function ScrollToTop() {
  const { pathname, hash } = useLocation();
  useEffect(() => {
    if (hash) return;
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [pathname, hash]);
  return null;
}

/** Marca el <html> mientras se está en el sitio: ver styles/escala.css. */
function EscalaSitio() {
  useEffect(() => {
    document.documentElement.classList.add("sitio-escala");
    return () => document.documentElement.classList.remove("sitio-escala");
  }, []);
  return null;
}

export default function WebRoutes() {
  return (
    <>
      <EscalaSitio />
      <Header />
      <ScrollToTop />

      {/* El Suspense envuelve sólo las páginas: al cambiar de sección la cabecera
          y el pie quedan quietos y sólo el medio espera. El alto mínimo evita que
          el pie salte hacia arriba mientras carga. */}
      <Suspense fallback={<div style={{ minHeight: "80vh" }} aria-busy="true" />}>
      <Routes>
        {/* 403 opcional */}
        <Route path="/403" element={<Forbidden403 />} />

        {/* Admin: login público */}
        {/* El admin del sitio y el panel son las mismas cuentas: quien
            autoriza es RequireWebEditor contra la sesión del panel. Esta ruta
            tenía su propio formulario y su propio token en localStorage;
            quedó sólo la redirección. */}
        <Route path="/admin/login" element={<Navigate to="/panel/login" replace />} />

        {/* El ABM de contenido se mudó al panel: es una herramienta del
            sistema y acá quedaba envuelta en el Header, el Footer y el
            Chatbot del sitio público. Se dejan las rutas viejas
            redirigiendo para no romper enlaces guardados. */}
        <Route path="/admin/dashboard-web" element={<Navigate to="/panel/sitio" replace />} />
        <Route path="/admin/dashboard" element={<Navigate to="/panel/sitio" replace />} />
        <Route
          path="/admin/medicos-promo"
          element={<Navigate to="/panel/sitio/medicos-promo" replace />}
        />

        {/* Rutas públicas */}
        <Route path="/" element={<Home />} />
        <Route path="/contacto" element={<Contacto />} />
        <Route path="/noticias" element={<NoticiasPage />} />
        <Route path="/noticias/:id" element={<NoticiaDetail />} />
        <Route path="/cursos" element={<CursosPage />} />
        <Route path="/cursos/:id" element={<CursoDetailPage />} />
        <Route path="/nosotros" element={<NosotrosPage />} />
        <Route path="/servicios" element={<Servicios />} />
        <Route path="/convenios" element={<ConveniosPage />} />
        <Route path="/beneficios" element={<BeneficiosPage />} />
        <Route path="/quinta" element={<QuintaPage />} />
        <Route path="/seguros" element={<SegurosPage />} />
        <Route path="/medicos-asociados" element={<Asociados />} />
        <Route path="/socios" element={<SociosPage />} />
        <Route path="/prevencion-salud" element={<PrevencionSaludPage />} />
        <Route path="/preguntas-frecuentes" element={<PreguntasFrecuentesPage />} />
     

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      </Suspense>

      <Chatbot />
      <Footer />
    </>
  );
}
