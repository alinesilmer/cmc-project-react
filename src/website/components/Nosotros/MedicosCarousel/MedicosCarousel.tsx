// website/src/website/components/MedicosCarousel/MedicosCarousel.tsx
import { useEffect, useMemo, useRef, useState } from "react";
import { medicosPromo } from "../../../lib/api";
import type { MedicoPromo } from "../../../lib/api";
import { FiChevronLeft, FiChevronRight, FiX } from "react-icons/fi";
import styles from "./MedicosCarousel.module.scss";

export default function MedicosCarousel() {
  const [items, setItems] = useState<MedicoPromo[]>([]);
  const [idx, setIdx] = useState(0);
  const [modal, setModal] = useState<{ open: boolean; url: string; type: "image" | "video"; title: string }>({
    open: false, url: "", type: "image", title: "",
  });
  const trackRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    medicosPromo.list().then((rows) => setItems(rows.filter((r) => r.activo).slice(0, 10)));
  }, []);

  useEffect(() => {
    if (!items.length) return;
    const t = setInterval(() => setIdx((i) => (i + 1) % items.length), 4000);
    return () => clearInterval(t);
  }, [items.length]);

  const transform = useMemo(() => `translateX(calc(-${idx} * (280px + var(--gap, 16px))))`, [idx]);

  const prev = () => setIdx((i) => (i - 1 + items.length) % items.length);
  const next = () => setIdx((i) => (i + 1) % items.length);

  const openModal = (it: MedicoPromo) => {
    const type: "image" | "video" = it.mediaType === "video" ? "video" : "image";
    setModal({ open: true, url: it.mediaUrl || "", type, title: it.nombre });
  };
  const closeModal = () => setModal({ open: false, url: "", type: "image", title: "" });

  return (
    <>
      <div className={styles.carousel}>
        <div className={styles.track} ref={trackRef} style={{ transform }}>
          {items.map((m) => (
            <article key={m.id} className={styles.card} onClick={() => openModal(m)} role="button" tabIndex={0}>
              <div className={styles.media}>
                {m.mediaType === "video" ? (
                  <video src={m.mediaUrl} preload="metadata" />
                ) : (
                  <img src={m.mediaUrl || "/placeholder.svg"} alt={m.nombre} />
                )}
              </div>
              <div className={styles.name}>{m.nombre}</div>
              <div className={styles.spec}>{m.especialidad}</div>
            </article>
          ))}
        </div>

       
      </div>

      {modal.open && (
        <div className={styles.modalBackdrop} onClick={closeModal}>
          <div className={styles.modalDialog} onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
            <button className={styles.modalClose} onClick={closeModal} aria-label="Cerrar">
              <FiX />
            </button>
            <div className={styles.modalMedia}>
              {modal.type === "video" ? (
                <video src={modal.url} controls autoPlay />
              ) : (
                <img src={modal.url} alt={modal.title} />
              )}
            </div>
            <div className={styles.modalCaption}>{modal.title}</div>
          </div>
        </div>
      )}
    </>
  );
}
