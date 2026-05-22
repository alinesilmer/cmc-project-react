import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import styles from "./PromoModal.module.scss";
import Button from "../../UI/Button/Button";

const WaIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
    <path d="M12 0C5.373 0 0 5.373 0 12c0 2.127.558 4.126 1.532 5.862L.054 23.61a.5.5 0 0 0 .608.625l5.99-1.57A11.945 11.945 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22a9.944 9.944 0 0 1-5.127-1.422l-.368-.22-3.814 1 .983-3.596-.24-.371A9.944 9.944 0 0 1 2 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/>
  </svg>
);

interface Contact {
  name: string;
  phone: string; // digits only, e.g. "3794006475"
}

interface PromoModalProps {
  imageSrc: string;
  imageAlt?: string;
  contacts?: Contact[];
  storageKey?: string;
}

export default function PromoModal({
  imageSrc,
  imageAlt = "Anuncio",
  contacts,
  storageKey = "promo-modal-seen",
}: PromoModalProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const seen = sessionStorage.getItem(storageKey);
    if (!seen) {
      const t = setTimeout(() => setVisible(true), 600);
      return () => clearTimeout(t);
    }
  }, [storageKey]);

  function dismiss() {
    setVisible(false);
    sessionStorage.setItem(storageKey, "1");
  }

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className={styles.overlay}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.28 }}
          onClick={(e) => { if (e.target === e.currentTarget) dismiss(); }}
          role="dialog"
          aria-modal="true"
          aria-label={imageAlt}
        >
          <motion.div
            className={styles.modal}
            initial={{ opacity: 0, scale: 0.88, y: 24 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 16 }}
            transition={{ type: "spring", stiffness: 320, damping: 28 }}
          >
            {/* Close */}
            <button className={styles.closeBtn} onClick={dismiss} aria-label="Cerrar anuncio">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>

            {/* Full image */}
            <div className={styles.imageWrapper}>
              <img src={imageSrc} alt={imageAlt} draggable={false} />
            </div>

            {/* Contact buttons */}
            {contacts && contacts.length > 0 && (
              <div className={styles.contactBar}>
                <span className={styles.contactLabel}>Consultá con:</span>

                <div className={styles.contactBtns}>
                  {contacts.map((c) => (
                    <Button
                      key={c.phone}
                      variant="secondary"
                      size="small"
                      fullWidth
                      icon={<WaIcon />}
                      onClick={() => window.open(`https://wa.me/54${c.phone}`, "_blank")}
                    >
                      {c.name} · {c.phone}
                    </Button>
                  ))}
                </div>
              </div>
            )}

          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
