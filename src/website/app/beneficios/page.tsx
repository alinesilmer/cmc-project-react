import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CircleUserRound, Download, IdCard, LogIn, Percent, Store } from "lucide-react";
import ContenedorPagina from "../../components/UI/ContenedorPagina/ContenedorPagina";
import CabeceraFresca from "../../components/UI/CabeceraFresca/CabeceraFresca";
import CaminoPasos from "../../components/UI/CaminoPasos/CaminoPasos";
import Button from "../../components/UI/Button/Button";
import Buscador from "../../components/UI/Buscador/Buscador";
import FiltroChips from "../../components/UI/FiltroChips/FiltroChips";
import Esqueletos from "../../components/UI/Esqueletos/Esqueletos";
import TarjetaBeneficio from "./components/TarjetaBeneficio";
import BandaInvitacion from "../../components/UI/BandaInvitacion/BandaInvitacion";
import { listBeneficiosVigentes, type BeneficioPublico } from "../../lib/beneficios.client";
import { coincide } from "../../lib/texto";
import { CONVENIO_COMERCIOS } from "../../lib/contacto";
import { useTituloPagina } from "../../hooks/useTituloPagina";
import styles from "./beneficios.module.scss";

const TODAS = "Todas";
const SIN_BENEFICIOS: BeneficioPublico[] = [];

// Servido desde /public: URL estable, se puede compartir o imprimir.
const INSTRUCTIVO_PDF = "/InstructivoCredencialCMC.pdf";

// Cómo se usa un beneficio, en tres palabras: la credencial está en el panel.
const PASOS = [
  { icono: LogIn, palabra: "Entrá" },
  { icono: CircleUserRound, palabra: "Tu perfil" },
  { icono: IdCard, palabra: "¡Mostrala!" },
];

const DESTACADOS = [
  { icono: Percent, texto: "Descuentos" },
  { icono: Store, texto: "Comercios adheridos" },
];

export default function BeneficiosPage() {
  useTituloPagina("Beneficios para Socios");

  const [categoria, setCategoria] = useState(TODAS);
  const [busqueda, setBusqueda] = useState("");

  const { data: items = SIN_BENEFICIOS, isPending, isError } = useQuery({
    queryKey: ["web", "beneficios-vigentes"],
    queryFn: () => listBeneficiosVigentes(),
    staleTime: 10 * 60 * 1000,
  });

  // Las categorías salen de lo que realmente vino: un filtro con opciones
  // vacías es peor que no tenerlo.
  const categorias = useMemo(
    () => [TODAS, ...Array.from(new Set(items.map((b) => b.categoria))).sort((a, b) => a.localeCompare(b, "es"))],
    [items]
  );

  // Categoría Y texto: los dos filtros se combinan.
  const visibles = useMemo(
    () =>
      items.filter(
        (b) =>
          (categoria === TODAS || b.categoria === categoria) &&
          coincide(busqueda, [b.titulo, b.descripcion, b.categoria, b.ubicacion, b.descuento])
      ),
    [items, categoria, busqueda]
  );

  const listo = !isPending && !isError;

  return (
    <ContenedorPagina>
      <CabeceraFresca
        titulo={
          <>
            Beneficios <span>para vos</span>
          </>
        }
        lema={
          <>
            Tu credencial <em>vale más.</em>
          </>
        }
        destacados={DESTACADOS}
        acciones={
          <Button href={INSTRUCTIVO_PDF} download variant="secondary" size="large" iconoIzquierda={<Download />}>
            Instructivo
          </Button>
        }
      >
        <CaminoPasos pasos={PASOS} descripcion="Entrá al panel, abrí tu perfil y mostrá la credencial en el comercio" />
      </CabeceraFresca>

      <section className={styles.listado} aria-label="Beneficios vigentes">
        {listo && items.length > 0 && (
          <Buscador valor={busqueda} onCambio={setBusqueda} placeholder="Buscar…" etiqueta="Buscar beneficio" className={styles.buscador} />
        )}

        {categorias.length > 2 && (
          <FiltroChips
            opciones={categorias}
            activa={categoria}
            onElegir={(c) => setCategoria(c ?? TODAS)}
            etiqueta="Categorías"
          />
        )}

        {isPending ? (
          <Esqueletos cantidad={6} className={styles.grid} clasePieza={styles.skeleton} />
        ) : (
          <div className={styles.grid}>
            {visibles.map((b, i) => (
              <TarjetaBeneficio key={b.id} beneficio={b} indice={i} />
            ))}
          </div>
        )}

        {isError && <p className={styles.aviso}>No pudimos cargarlos. Probá más tarde.</p>}

        {listo && visibles.length === 0 && (
          <p className={styles.aviso}>
            {items.length === 0 ? "Muy pronto." : busqueda.trim() ? `Nada para «${busqueda.trim()}».` : "Nada en esta categoría."}
          </p>
        )}
      </section>

      <BandaInvitacion
        titulo={
          <>
            ¿Tenés un comercio? <em>Sumate.</em>
          </>
        }
        bajada="Firmá convenio con el Colegio Médico de Corrientes y acercá tu negocio o producto a nuestros prestigiosos profesionales."
        whatsapp={{
          numero: CONVENIO_COMERCIOS.whatsapp,
          visible: CONVENIO_COMERCIOS.whatsappVisible,
          mensaje: CONVENIO_COMERCIOS.mensajeWhatsApp,
        }}
        email={{ direccion: CONVENIO_COMERCIOS.email, asunto: CONVENIO_COMERCIOS.asuntoEmail }}
      />
    </ContenedorPagina>
  );
}
