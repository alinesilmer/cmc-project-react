import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { ImageOff, Maximize2 } from "lucide-react";

import Buscador from "../../UI/Buscador/Buscador";
import Esqueletos from "../../UI/Esqueletos/Esqueletos";
import AvisoAmpliado from "./AvisoAmpliado";
import { iniciales, nombreDe } from "./avisos";
import { listAdsPublicos, type PubAd } from "../../../lib/ads.client";
import { coincide } from "../../../lib/texto";
import styles from "./MedicosDirectorio.module.scss";

/**
 * Directorio de avisos profesionales de médicos asociados.
 *
 * Reemplaza al carrusel con autoplay que había antes. El cambio no es estético:
 * el carrusel mostraba tres tarjetas y se movía solo cada 2,6 s, así que para
 * encontrar a alguien había que esperar a que pasara. Acá están todos a la vez
 * y se filtran por nombre.
 *
 * Ojo con qué es esta lista: son los médicos que publicaron su aviso en el
 * Colegio (`/api/publicidad-medicos`), no el padrón de asociados. La pantalla
 * lo dice explícitamente — ver `page.tsx`.
 */

const SIN_AVISOS: PubAd[] = [];

export default function MedicosDirectorio() {
  const [busqueda, setBusqueda] = useState("");
  // Índice dentro de `visibles`: el modal pasa de un aviso al siguiente.
  const [ampliado, setAmpliado] = useState<number | null>(null);

  const { data: avisos = SIN_AVISOS, isPending, isError } = useQuery({
    queryKey: ["web", "avisos-medicos"],
    queryFn: () => listAdsPublicos(),
    staleTime: 10 * 60 * 1000,
  });

  const visibles = useMemo(() => avisos.filter((ad) => coincide(busqueda, [nombreDe(ad)])), [avisos, busqueda]);

  if (isPending) return <Esqueletos cantidad={8} className={styles.grid} clasePieza={styles.esqueleto} />;

  if (isError) {
    return (
      <p className={styles.aviso} role="status">
        No pudimos cargar los avisos en este momento. Probá de nuevo en un rato.
      </p>
    );
  }

  if (avisos.length === 0) {
    return (
      <p className={styles.aviso} role="status">
        Todavía no hay avisos publicados. Si sos socio y querés que el tuyo aparezca acá, escribinos al Colegio.
      </p>
    );
  }

  return (
    <>
      <div className={styles.barra}>
        <Buscador
          valor={busqueda}
          onCambio={setBusqueda}
          placeholder="Buscar por nombre o apellido"
          etiqueta="Buscar médico por nombre o apellido"
          className={styles.buscador}
        />
        <p className={styles.conteo} aria-live="polite">
          {busqueda ? `${visibles.length} de ${avisos.length}` : `${avisos.length} ${avisos.length === 1 ? "aviso" : "avisos"}`}
        </p>
      </div>

      {visibles.length === 0 ? (
        <p className={styles.aviso} role="status">
          No encontramos a nadie con «{busqueda}». Probá con el apellido solo.
        </p>
      ) : (
        <ul className={styles.grid}>
          {visibles.map((ad, i) => {
            const nombre = nombreDe(ad);
            return (
              <motion.li
                key={ad.id}
                className={styles.item}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                // Techo al escalonado: con muchos avisos el último entraría tardísimo.
                transition={{ duration: 0.24, delay: Math.min(i, 10) * 0.03 }}
              >
                <button
                  type="button"
                  className={styles.tarjeta}
                  onClick={() => setAmpliado(i)}
                  aria-label={`Ver el aviso de ${nombre}`}
                >
                  <span className={styles.media}>
                    {ad.adjunto_path ? (
                      <img
                        src={ad.adjunto_path}
                        alt=""
                        // Las primeras entran con la página; el resto al scrollear.
                        loading={i < 8 ? "eager" : "lazy"}
                        decoding="async"
                        draggable={false}
                      />
                    ) : (
                      <span className={styles.sinImagen}>
                        <ImageOff size={22} aria-hidden="true" />
                      </span>
                    )}
                    <span className={styles.ver} aria-hidden="true">
                      <Maximize2 />
                      Ver aviso
                    </span>
                  </span>
                  <span className={styles.pie}>
                    <span className={styles.iniciales} aria-hidden="true">
                      {iniciales(nombre)}
                    </span>
                    <span className={styles.nombre}>{nombre}</span>
                  </span>
                </button>
              </motion.li>
            );
          })}
        </ul>
      )}

      {ampliado !== null && visibles[ampliado] && (
        <AvisoAmpliado
          avisos={visibles}
          indice={ampliado}
          onCambiar={setAmpliado}
          onCerrar={() => setAmpliado(null)}
        />
      )}
    </>
  );
}
