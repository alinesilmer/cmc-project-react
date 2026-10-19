import AfiliadosPorObraSocialPage from "@/app/pages/AfiliadosPorObraSocialPage/AfiliadosPorObraSocialPage";

// `/panel/padron-socio` sigue existiendo (el menú y los enlaces viejos apuntan acá), pero ya no es una pantalla aparte.
export default function PadronPorSocio() {
  return <AfiliadosPorObraSocialPage vistaInicial="socio" />;
}
