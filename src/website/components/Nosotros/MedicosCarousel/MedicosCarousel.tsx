// src/website/components/MedicosCarousel/MedicosCarousel.tsx
import { useEffect, useMemo, useRef, useState } from "react";
import { FiChevronLeft, FiChevronRight, FiX } from "react-icons/fi";
import styles from "./MedicosCarousel.module.scss";
import { listAds } from "../../../lib/ads.client";
import type { PubAd } from "../../../lib/ads.client";

type ModalState = { open: boolean; url: string; title: string };

export default function MedicosCarousel() {
  const [items, setItems] = useState<PubAd[]>([]);
  // índice virtual (arranca en el centro para permitir ir a ambos lados)
  const [vIdx, setVIdx] = useState(0);
  const [animating, setAnimating] = useState(true);
  const [modal, setModal] = useState<ModalState>({
    open: false,
    url: "",
    title: "",
  });

  const trackRef = useRef<HTMLDivElement>(null);
  const cardWRef = useRef<number>(280);
  const gapRef = useRef<number>(16);
  const autoplayRef = useRef<number | null>(null);

  // Cargar publicidades activas (máx 10)
  useEffect(() => {
    (async () => {
      try {
        const rows = await listAds({ activo: true });
        const slice = rows.slice(0, 10);
        setItems(slice);
        // seteamos índice al centro (bloque 2 de 3)
        setVIdx(slice.length); // bloque central
      } catch (e) {
        console.error("No se pudieron cargar las publicidades:", e);
        setItems([]);
      }
    })();
  }, []);

  // Medir card width + gap para un desplazamiento exacto en px
  const measure = () => {
    const track = trackRef.current;
    if (!track) return;
    const first = track.querySelector<HTMLElement>("[data-card]");
    if (first) {
      cardWRef.current = first.offsetWidth;
    }
    const cs = getComputedStyle(track);
    // para grid, usar column-gap/gap; para flex, gap
    const g = parseFloat((cs as any).columnGap || cs.gap || "16");
    gapRef.current = isNaN(g) ? 16 : g;
  };

  useEffect(() => {
    // medir tras el render
    const id = requestAnimationFrame(measure);
    const onResize = () => measure();
    window.addEventListener("resize", onResize);
    return () => {
      cancelAnimationFrame(id);
      window.removeEventListener("resize", onResize);
    };
  }, [items.length]);

  // Lista renderizada con clones (triple)
  const triple = useMemo(() => {
    if (!items.length) return [];
    return [...items, ...items, ...items];
  }, [items]);

  const LEN = items.length; // original
  const TOTAL = triple.length; // 3 * LEN

  // Transform calculado en px
  const transform = useMemo(() => {
    const step = cardWRef.current + gapRef.current;
    const x = -vIdx * step;
    return `translateX(${x}px)`;
  }, [vIdx]);

  // Autoplay
  useEffect(() => {
    if (LEN <= 1) return;
    autoplayRef.current = window.setInterval(() => {
      goNext();
    }, 4000);
    return () => {
      if (autoplayRef.current) clearInterval(autoplayRef.current);
      autoplayRef.current = null;
    };
  }, [LEN]);

  // Handlers next/prev
  const goNext = () => {
    if (!LEN) return;
    setAnimating(true);
    setVIdx((i) => i + 1);
  };

  const goPrev = () => {
    if (!LEN) return;
    setAnimating(true);
    setVIdx((i) => i - 1);
  };

  // Al terminar la transición: si salimos del bloque central, saltamos sin animación
  const onTransitionEnd = () => {
    if (!LEN) return;
    // si pasamos del final del bloque central (>= 2*LEN), saltamos atrás LEN
    if (vIdx >= 2 * LEN) {
      setAnimating(false);
      setVIdx((i) => i - LEN);
      // reactivar animación en el siguiente frame
      requestAnimationFrame(() => setAnimating(true));
    }
    // si pasamos al bloque anterior (< LEN), saltamos adelante LEN
    else if (vIdx < LEN) {
      setAnimating(false);
      setVIdx((i) => i + LEN);
      requestAnimationFrame(() => setAnimating(true));
    }
  };

  const openModal = (ad: PubAd) => {
    setModal({
      open: true,
      url: ad.adjunto_path || "/placeholder.svg",
      title: ad.medico_nombre || `Médico #${ad.medico_id}`,
    });
  };
  const closeModal = () => setModal({ open: false, url: "", title: "" });

  if (LEN === 0) return null;

  return (
    <>
      <div
        className={styles.carousel}
        onMouseEnter={() => {
          if (autoplayRef.current) {
            clearInterval(autoplayRef.current);
            autoplayRef.current = null;
          }
        }}
        onMouseLeave={() => {
          if (LEN > 1 && !autoplayRef.current) {
            autoplayRef.current = window.setInterval(goNext, 4000);
          }
        }}
      >
        <div
          className={styles.track}
          ref={trackRef}
          style={{
            transform,
            transition: animating ? "transform .45s ease" : "none",
          }}
          onTransitionEnd={onTransitionEnd}
        >
          {triple.map((ad, i) => (
            <article
              key={`${ad.id}-${i}`}
              className={styles.card}
              data-card
              onClick={() => openModal(ad)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) =>
                (e.key === "Enter" || e.key === " ") && openModal(ad)
              }
            >
              <div className={styles.media}>
                <img
                  src={ad.adjunto_path || "/placeholder.svg"}
                  alt={ad.medico_nombre || `Médico #${ad.medico_id}`}
                />
              </div>
              <div className={styles.name}>
                {ad.medico_nombre || `Médico #${ad.medico_id}`}
              </div>
            </article>
          ))}
        </div>

        {LEN > 1 && (
          <div className={styles.nav} aria-hidden="false">
            <button aria-label="Anterior" onClick={goPrev}>
              <FiChevronLeft />
            </button>
            <button aria-label="Siguiente" onClick={goNext}>
              <FiChevronRight />
            </button>
          </div>
        )}
      </div>

      {modal.open && (
        <div className={styles.modalBackdrop} onClick={closeModal}>
          <div
            className={styles.modalDialog}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <button
              className={styles.modalClose}
              onClick={closeModal}
              aria-label="Cerrar"
            >
              <FiX />
            </button>
            <div className={styles.modalMedia}>
              <img src={modal.url} alt={modal.title} />
            </div>
            <div className={styles.modalCaption}>{modal.title}</div>
          </div>
        </div>
      )}
    </>
  );
}
