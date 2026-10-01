import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Search, X, ImageOff, Loader2 } from "lucide-react";

import { listAds } from "../../../lib/ads.client";
import type { PubAd } from "../../../lib/ads.client";
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

type Estado = "cargando" | "listo" | "error";

/** Sin acentos ni mayúsculas, para que "Ramirez" encuentre a "Ramírez". */
const normalizar = (valor: string): string =>
  valor
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();

const nombreDe = (ad: PubAd): string =>
  ad.medico_nombre?.trim() || `Médico #${ad.medico_id}`;

interface ModalState {
  url: string;
  titulo: string;
}

export default function MedicosDirectorio() {
  const [avisos, setAvisos] = useState<PubAd[]>([]);
  const [estado, setEstado] = useState<Estado>("cargando");
  const [busqueda, setBusqueda] = useState("");
  const [modal, setModal] = useState<ModalState | null>(null);

  // Para devolver el foco a la tarjeta cuando se cierra el modal.
  const disparador = useRef<HTMLElement | null>(null);
  const cerrarRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    let vigente = true;
    (async () => {
      try {
        const filas = await listAds({ activo: true });
        if (!vigente) return;
        setAvisos(filas);
        setEstado("listo");
      } catch (e) {
        if (!vigente) return;
        console.error("No se pudieron cargar los avisos profesionales:", e);
        setEstado("error");
      }
    })();
    return () => {
      vigente = false;
    };
  }, []);

  const visibles = useMemo(() => {
    const q = normalizar(busqueda);
    if (!q) return avisos;
    return avisos.filter((ad) => normalizar(nombreDe(ad)).includes(q));
  }, [avisos, busqueda]);

  // ── Modal ───────────────────────────────────────────────────────────────────

  const abrir = (ad: PubAd, origen: HTMLElement) => {
    disparador.current = origen;
    setModal({ url: ad.adjunto_path || "", titulo: nombreDe(ad) });
  };

  const cerrar = () => {
    setModal(null);
    disparador.current?.focus();
    disparador.current = null;
  };

  useEffect(() => {
    if (!modal) return;

    const previo = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    cerrarRef.current?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") cerrar();
    };
    window.addEventListener("keydown", onKey);

    return () => {
      document.body.style.overflow = previo;
      window.removeEventListener("keydown", onKey);
    };
  }, [modal]);

  // ── Estados ─────────────────────────────────────────────────────────────────

  if (estado === "cargando") {
    return (
      <div className={styles.grid} aria-busy="true" aria-live="polite">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className={styles.esqueleto} />
        ))}
      </div>
    );
  }

  if (estado === "error") {
    return (
      <p className={styles.aviso} role="status">
        No pudimos cargar los avisos en este momento. Probá de nuevo en un rato.
      </p>
    );
  }

  if (avisos.length === 0) {
    return (
      <p className={styles.aviso} role="status">
        Todavía no hay avisos publicados. Si sos socio y querés que el tuyo
        aparezca acá, escribinos al Colegio.
      </p>
    );
  }

  return (
    <>
      <div className={styles.barra}>
        <div className={styles.buscador}>
          <Search size={18} className={styles.lupa} aria-hidden="true" />
          <input
            id="buscar-medico"
            type="search"
            className={styles.input}
            placeholder="Buscar por nombre o apellido"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            aria-label="Buscar médico por nombre o apellido"
            autoComplete="off"
          />
          {busqueda && (
            <button
              type="button"
              className={styles.limpiar}
              onClick={() => setBusqueda("")}
              aria-label="Borrar la búsqueda"
            >
              <X size={16} />
            </button>
          )}
        </div>

        <p className={styles.conteo} aria-live="polite">
          {busqueda
            ? `${visibles.length} de ${avisos.length}`
            : `${avisos.length} ${avisos.length === 1 ? "aviso" : "avisos"}`}
        </p>
      </div>

      {visibles.length === 0 ? (
        <p className={styles.aviso} role="status">
          No encontramos a nadie con «{busqueda}». Probá con el apellido solo.
        </p>
      ) : (
        <ul className={styles.grid}>
          {visibles.map((ad, i) => (
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
                onClick={(e) => abrir(ad, e.currentTarget)}
                aria-label={`Ver el aviso de ${nombreDe(ad)}`}
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
                </span>
                <span className={styles.nombre}>{nombreDe(ad)}</span>
              </button>
            </motion.li>
          ))}
        </ul>
      )}

      {modal && (
        <div
          className={styles.fondo}
          onClick={cerrar}
          role="presentation"
        >
          <div
            className={styles.dialogo}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label={`Aviso de ${modal.titulo}`}
          >
            <button
              ref={cerrarRef}
              type="button"
              className={styles.cerrar}
              onClick={cerrar}
              aria-label="Cerrar"
            >
              <X size={18} />
            </button>

            <div className={styles.dialogoMedia}>
              {modal.url ? (
                <img src={modal.url} alt={`Aviso de ${modal.titulo}`} decoding="async" />
              ) : (
                <span className={styles.sinImagen}>
                  <Loader2 size={22} aria-hidden="true" />
                </span>
              )}
            </div>

            <p className={styles.dialogoPie}>{modal.titulo}</p>
          </div>
        </div>
      )}
    </>
  );
}
