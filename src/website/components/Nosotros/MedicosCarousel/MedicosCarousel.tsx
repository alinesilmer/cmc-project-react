// src/website/components/Nosotros/MedicosCarousel/MedicosCarousel.tsx
import { useEffect, useMemo, useRef, useState } from "react";
import { FiChevronLeft, FiChevronRight, FiX } from "react-icons/fi";
import styles from "./MedicosCarousel.module.scss";
import { listAds } from "../../../lib/ads.client";
import type { PubAd } from "../../../lib/ads.client";

type ModalState = { open: boolean; url: string; title: string };

export default function MedicosCarousel() {
  const [items, setItems] = useState<PubAd[]>([]);
  // índice de la PRIMER card visible
  const [index, setIndex] = useState(0);
  // cuántas cards entran en el viewport (1 / 2 / 3)
  const [visibleCount, setVisibleCount] = useState(1);
  const [modal, setModal] = useState<ModalState>({
    open: false,
    url: "",
    title: "",
  });

  const trackRef = useRef<HTMLDivElement>(null);
  const cardWRef = useRef<number>(280);
  const gapRef = useRef<number>(16);
  const autoplayRef = useRef<number | null>(null);

  // ==== CARGA PUBLICIDADES ====
  useEffect(() => {
    (async () => {
      try {
        const rows = await listAds({ activo: true });
        const slice = rows.slice(0, 60); // máximo 10
        setItems(slice);
        setIndex(0);
      } catch (e) {
        console.error("No se pudieron cargar las publicidades:", e);
        setItems([]);
      }
    })();
  }, []);

  const LEN = items.length;

  // ==== BREAKPOINTS → visibleCount (1 / 2 / 3) ====
  useEffect(() => {
    const calcVisible = () => {
      const w = window.innerWidth;
      if (w >= 1200) setVisibleCount(3); // desktop
      else if (w >= 768) setVisibleCount(2); // tablet
      else setVisibleCount(1); // mobile
    };
    calcVisible();
    window.addEventListener("resize", calcVisible);
    return () => window.removeEventListener("resize", calcVisible);
  }, []);

  // puede scrollear solo si hay MÁS items que los que entran
  const canScroll = LEN > visibleCount;

  // clamp del índice cuando cambian cantidad de items o visibles
  useEffect(() => {
    const maxIndex = Math.max(0, LEN - visibleCount);
    setIndex((prev) => Math.min(prev, maxIndex));
  }, [LEN, visibleCount]);

  // ==== MEDIR ANCHO CARD + GAP (para mover en px) ====
  const measure = () => {
    const track = trackRef.current;
    if (!track) return;
    const first = track.querySelector<HTMLElement>("[data-card]");
    if (first) {
      cardWRef.current = first.offsetWidth;
    }
    const cs = getComputedStyle(track);
    const g = parseFloat((cs as any).columnGap || cs.gap || "16");
    gapRef.current = Number.isNaN(g) ? 16 : g;
  };

  useEffect(() => {
    const id = requestAnimationFrame(measure);
    const onResize = () => measure();
    window.addEventListener("resize", onResize);
    return () => {
      cancelAnimationFrame(id);
      window.removeEventListener("resize", onResize);
    };
  }, [LEN, visibleCount]);

  // ==== TRANSFORM EN PX SEGÚN INDEX ====
  const transform = useMemo(() => {
    const step = cardWRef.current + gapRef.current;
    const x = -index * step;
    return `translateX(${x}px)`;
  }, [index]);

  // ==== NAVEGACIÓN (SIN CLONES, con wrap) ====
  const goNext = () => {
    if (!canScroll) return;
    setIndex((prev) => {
      const maxIndex = Math.max(0, LEN - visibleCount);
      return prev >= maxIndex ? 0 : prev + 1; // último -> vuelve al primero
    });
  };

  const goPrev = () => {
    if (!canScroll) return;
    setIndex((prev) => {
      const maxIndex = Math.max(0, LEN - visibleCount);
      return prev <= 0 ? maxIndex : prev - 1; // primero -> salta al último bloque
    });
  };

  // ==== AUTOPLAY CADA 2s (solo si hay flechas) ====
  useEffect(() => {
    if (!canScroll) return;

    autoplayRef.current = window.setInterval(() => {
      setIndex((prev) => {
        const maxIndex = Math.max(0, LEN - visibleCount);
        return prev >= maxIndex ? 0 : prev + 1;
      });
    }, 2000); // 2 segundos

    return () => {
      if (autoplayRef.current != null) {
        clearInterval(autoplayRef.current);
        autoplayRef.current = null;
      }
    };
  }, [canScroll, LEN, visibleCount]);

  // ==== MODAL ====
  const openModal = (ad: PubAd) => {
    setModal({
      open: true,
      url: ad.adjunto_path || "/placeholder.svg",
      title: ad.medico_nombre || `Médico #${ad.medico_id}`,
    });
  };

  const closeModal = () =>
    setModal({
      open: false,
      url: "",
      title: "",
    });

  if (LEN === 0) return null;

  return (
    <>
      <div
        className={styles.carousel}
        onMouseEnter={() => {
          if (autoplayRef.current != null) {
            clearInterval(autoplayRef.current);
            autoplayRef.current = null;
          }
        }}
        onMouseLeave={() => {
          if (canScroll && autoplayRef.current == null) {
            autoplayRef.current = window.setInterval(() => {
              setIndex((prev) => {
                const maxIndex = Math.max(0, LEN - visibleCount);
                return prev >= maxIndex ? 0 : prev + 1;
              });
            }, 2000);
          }
        }}
      >
        <div
          className={styles.track}
          ref={trackRef}
          style={{
            transform,
            transition: "transform .45s ease",
          }}
        >
          {items.map((ad, i) => (
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

        {/* Flechas solo si hay MÁS items que los que entran en el viewport */}
        {canScroll && (
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
