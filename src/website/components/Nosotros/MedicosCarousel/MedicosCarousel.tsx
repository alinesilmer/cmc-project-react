import { useEffect, useMemo, useRef, useState } from "react";
import { FiChevronLeft, FiChevronRight, FiX } from "react-icons/fi";
import styles from "./MedicosCarousel.module.scss";
import { listAds } from "../../../lib/ads.client";
import type { PubAd } from "../../../lib/ads.client";

type ModalState = { open: boolean; url: string; title: string };



export default function MedicosCarousel() {
  const [items, setItems] = useState<PubAd[]>([]);
  const [index, setIndex] = useState(0);
  const [visibleCount, setVisibleCount] = useState(1);
  const [modal, setModal] = useState<ModalState>({ open: false, url: "", title: "" });

  const viewportRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);

  const cardWRef = useRef<number>(0);
  const gapRef = useRef<number>(16);
  const stepRef = useRef<number>(0);

  const autoplayRef = useRef<number | null>(null);
  const ignoreScrollRef = useRef(false);
  const scrollRafRef = useRef<number | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const rows = await listAds({ activo: true });
        const slice = rows.slice(0, 60);
        setItems(slice);
        setIndex(0);
      } catch (e) {
        console.error("No se pudieron cargar las publicidades:", e);
        setItems([]);
      }
    })();
  }, []);

  const LEN = items.length;

  useEffect(() => {
    const calcVisible = () => {
      const w = window.innerWidth;
      if (w >= 1200) setVisibleCount(3);
      else if (w >= 768) setVisibleCount(2);
      else setVisibleCount(1);
    };
    calcVisible();
    window.addEventListener("resize", calcVisible, { passive: true });
    return () => window.removeEventListener("resize", calcVisible);
  }, []);

  const canScroll = LEN > visibleCount;

  useEffect(() => {
    const maxIndex = Math.max(0, LEN - visibleCount);
    setIndex((prev) => Math.min(prev, maxIndex));
  }, [LEN, visibleCount]);

  const measure = () => {
    const track = trackRef.current;
    const viewport = viewportRef.current;
    if (!track || !viewport) return;

    const first = track.querySelector<HTMLElement>("[data-card]");
    if (first) cardWRef.current = first.getBoundingClientRect().width;

    const cs = getComputedStyle(track);
    const g = parseFloat((cs as any).columnGap || cs.gap || "16");
    gapRef.current = Number.isNaN(g) ? 16 : g;

    stepRef.current = Math.max(1, cardWRef.current + gapRef.current);
  };

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;

    const ro = new ResizeObserver(() => measure());
    ro.observe(track);

    const id = requestAnimationFrame(measure);
    window.addEventListener("resize", measure, { passive: true });

    return () => {
      cancelAnimationFrame(id);
      window.removeEventListener("resize", measure);
      ro.disconnect();
    };
  }, [LEN, visibleCount]);

  const scrollToIndex = (i: number, behavior: ScrollBehavior = "smooth") => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    const step = stepRef.current || 1;
    ignoreScrollRef.current = true;
    viewport.scrollTo({ left: i * step, behavior });

    window.setTimeout(() => {
      ignoreScrollRef.current = false;
    }, behavior === "smooth" ? 350 : 0);
  };

  useEffect(() => {
    if (!canScroll) return;
    scrollToIndex(index, "smooth");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, canScroll]);

  const goNext = () => {
    if (!canScroll) return;
    setIndex((prev) => {
      const maxIndex = Math.max(0, LEN - visibleCount);
      return prev >= maxIndex ? 0 : prev + 1;
    });
  };

  const goPrev = () => {
    if (!canScroll) return;
    setIndex((prev) => {
      const maxIndex = Math.max(0, LEN - visibleCount);
      return prev <= 0 ? maxIndex : prev - 1;
    });
  };

  const prefersReducedMotion = useMemo(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ?? false;
  }, []);

  const stopAutoplay = () => {
    if (autoplayRef.current != null) {
      clearInterval(autoplayRef.current);
      autoplayRef.current = null;
    }
  };

  const startAutoplay = () => {
    if (!canScroll || prefersReducedMotion) return;
    if (autoplayRef.current != null) return;

    autoplayRef.current = window.setInterval(() => {
      setIndex((prev) => {
        const maxIndex = Math.max(0, LEN - visibleCount);
        return prev >= maxIndex ? 0 : prev + 1;
      });
    }, 2600);
  };

  useEffect(() => {
    stopAutoplay();
    startAutoplay();
    return () => stopAutoplay();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canScroll, LEN, visibleCount, prefersReducedMotion]);

  useEffect(() => {
    const onVis = () => {
      if (document.hidden) stopAutoplay();
      else startAutoplay();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canScroll, LEN, visibleCount, prefersReducedMotion]);

  const onScroll = () => {
    if (!canScroll) return;
    if (ignoreScrollRef.current) return;

    if (scrollRafRef.current != null) return;
    scrollRafRef.current = requestAnimationFrame(() => {
      scrollRafRef.current = null;

      const viewport = viewportRef.current;
      const step = stepRef.current || 1;
      if (!viewport) return;

      const nextIndex = Math.round(viewport.scrollLeft / step);
      const maxIndex = Math.max(0, LEN - visibleCount);
      const clamped = Math.min(Math.max(0, nextIndex), maxIndex);
      setIndex((prev) => (prev === clamped ? prev : clamped));
    });
  };

  const openModal = (ad: PubAd) => {
    setModal({
      open: true,
      url: ad.adjunto_path || "/placeholder.svg",
      title: ad.medico_nombre || `Médico #${ad.medico_id}`,
    });
  };

  const closeModal = () => setModal({ open: false, url: "", title: "" });

  useEffect(() => {
    if (!modal.open) return;

    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeModal();
    };
    window.addEventListener("keydown", onKey);

    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [modal.open]);

  if (LEN === 0) return null;

  return (
    <>
      <div
        className={styles.carousel}
        onPointerEnter={stopAutoplay}
        onPointerLeave={startAutoplay}
      >
        <div className={styles.viewport} ref={viewportRef} onScroll={onScroll}>
          <div className={styles.track} ref={trackRef}>
            {items.map((ad, i) => (
              <article
                key={`${ad.id}-${i}`}
                className={styles.card}
                data-card
                role="button"
                tabIndex={0}
                onClick={() => openModal(ad)}
                onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && openModal(ad)}
              >
                <div className={styles.media}>
                  <img
                    src={ad.adjunto_path || "/placeholder.svg"}
                    alt={ad.medico_nombre || `Médico #${ad.medico_id}`}
                    loading={i < visibleCount ? "eager" : "lazy"}
                    decoding="async"
                    draggable={false}
                  />
                </div>

                <div className={styles.name}>
                  {ad.medico_nombre || `Médico #${ad.medico_id}`}
                </div>
              </article>
            ))}
          </div>
        </div>

        {canScroll && (
          <div className={styles.nav} aria-hidden="false">
            <button type="button" aria-label="Anterior" onClick={goPrev}>
              <FiChevronLeft />
            </button>
            <button type="button" aria-label="Siguiente" onClick={goNext}>
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
            aria-label={modal.title}
          >
            <button
              type="button"
              className={styles.modalClose}
              onClick={closeModal}
              aria-label="Cerrar"
              autoFocus
            >
              <FiX />
            </button>

            <div className={styles.modalMedia}>
              <img src={modal.url} alt={modal.title} decoding="async" />
            </div>

            <div className={styles.modalCaption}>{modal.title}</div>
          </div>
        </div>
      )}
    </>
  );
}