// app/pages/DiscountsList/DiscountsList.tsx
"use client";

import type React from "react";
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Edit, Loader2, CheckCircle, AlertTriangle } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";

import SearchBar from "../../../components/molecules/SearchBar/SearchBar";
import Card from "../../../components/atoms/Card/Card";
import Button from "../../../components/atoms/Button/Button";
import styles from "./DiscountsList.module.scss";

type Discount = {
  id: string;
  concept: string;
  price: number;
  percentage: number;
};

const DiscountsList: React.FC = () => {
  const { id } = useParams(); // período activo
  const navigate = useNavigate();

  const [searchTerm, setSearchTerm] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmTarget, setConfirmTarget] = useState<Discount | null>(null);
  const [discounts, setDiscounts] = useState<Discount[]>([
    {
      id: "DESC001",
      concept: "Descuento por Volumen",
      price: 500,
      percentage: 5,
    },
    {
      id: "DESC002",
      concept: "Descuento por Pronto Pago",
      price: 200,
      percentage: 2,
    },
    {
      id: "DESC003",
      concept: "Descuento por Uso de Quinta",
      price: 1000,
      percentage: 10,
    },
    {
      id: "DESC004",
      concept: "Descuento por Campaña",
      price: 150,
      percentage: 1.5,
    },
  ]);

  const filtered = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return discounts;
    return discounts.filter(
      (d) =>
        d.id.toLowerCase().includes(q) || d.concept.toLowerCase().includes(q)
    );
  }, [discounts, searchTerm]);

  const [genOpen, setGenOpen] = useState(false);
  const [genStep, setGenStep] = useState<"idle" | "loading" | "done">("idle");

  const [editOpen, setEditOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [editPrice, setEditPrice] = useState<string>("");
  const [editPct, setEditPct] = useState<string>("");
  const [editError, setEditError] = useState<string>("");

  const openConfirm = (d: Discount) => {
    setConfirmTarget(d);
    setConfirmOpen(true);
  };
  const closeConfirm = () => {
    setConfirmOpen(false);
    setConfirmTarget(null);
  };
  const onConfirmGenerate = () => {
    setConfirmOpen(false);
    setGenOpen(true);
    setGenStep("loading");
  };

  useEffect(() => {
    if (genOpen && genStep === "loading") {
      const t = setTimeout(() => setGenStep("done"), 1500);
      return () => clearTimeout(t);
    }
  }, [genOpen, genStep]);

  const closeGenerate = () => {
    setGenOpen(false);
    setGenStep("idle");
  };

  const openEdit = (d: Discount) => {
    setEditId(d.id);
    setEditPrice(String(d.price));
    setEditPct(String(d.percentage));
    setEditError("");
    setEditOpen(true);
  };
  const closeEdit = () => {
    setEditOpen(false);
    setEditId(null);
    setEditError("");
  };

  const saveEdit = () => {
    const priceVal = Number(editPrice.replace(",", "."));
    const pctVal = Number(editPct.replace(",", "."));
    if (!Number.isFinite(priceVal) || priceVal < 0) {
      setEditError("Precio inválido.");
      return;
    }
    if (!Number.isFinite(pctVal) || pctVal < 0 || pctVal > 100) {
      setEditError("El porcentaje debe estar entre 0 y 100.");
      return;
    }
    if (!editId) return;
    setDiscounts((prev) =>
      prev.map((d) =>
        d.id === editId ? { ...d, price: priceVal, percentage: pctVal } : d
      )
    );
    closeEdit();
  };

  const currency = (n: number) =>
    n.toLocaleString("es-AR", {
      style: "currency",
      currency: "ARS",
      maximumFractionDigits: 2,
    });

  const goTab = (tab: "obras" | "debitos") => {
    if (!id) return;
    navigate(
      tab === "obras" ? `/liquidation/${id}` : `/liquidation/${id}/debitos`
    );
  };

  return (
    <div className={styles.discountsPage}>
      <div className={styles.content}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className={styles.header}>
            <div>
              <h1 className={styles.title}>Débitos de Colegio</h1>
            </div>
            <SearchBar
              placeholder="Buscar por ID o concepto…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Tabs para mantener navegación coherente */}
          <div className={styles.tabs}>
            <button className={styles.tab} onClick={() => goTab("obras")}>
              Obras Sociales
            </button>
            <button
              className={`${styles.tab} ${styles.active}`}
              onClick={() => goTab("debitos")}
            >
              Débitos de Colegio
            </button>
          </div>

          <Card className={styles.tableCard}>
            <div className={styles.table}>
              <div className={styles.tableHeader}>
                <div>ID</div>
                <div>CONCEPTO</div>
                <div>PRECIO</div>
                <div>%</div>
                <div>ACCIONES</div>
              </div>

              {filtered.map((discount) => (
                <div key={discount.id} className={styles.tableRow}>
                  <div>{discount.id}</div>
                  <div className={styles.conceptCell}>{discount.concept}</div>
                  <div>{currency(discount.price)}</div>
                  <div>{discount.percentage}%</div>
                  <div className={styles.actions}>
                    <Button
                      size="sm"
                      variant="primary"
                      onClick={() => openConfirm(discount)}
                    >
                      Generar
                    </Button>

                    {confirmOpen && (
                      <div
                        className={styles.modalBackdrop}
                        role="dialog"
                        aria-modal="true"
                      >
                        <motion.div
                          className={`${styles.modal} ${styles.modalSmall}`}
                          initial={{ opacity: 0, y: 8, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          transition={{
                            type: "spring",
                            stiffness: 260,
                            damping: 20,
                          }}
                        >
                          <div className={styles.modalHeader}>
                            <h4 className={styles.modalTitle}>
                              Confirmar generación
                            </h4>
                            <button
                              className={styles.iconClose}
                              onClick={closeConfirm}
                              aria-label="Cerrar"
                            >
                              ×
                            </button>
                          </div>
                          <div className={styles.modalBodyCenter}>
                            <AlertTriangle
                              className={styles.warningIcon}
                              size={42}
                            />
                            <div className={styles.modalMessageStrong}>
                              ¿Seguro que querés generar los descuentos?
                            </div>
                            <div className={styles.confirmText}>
                              {confirmTarget?.id} • {confirmTarget?.concept}
                            </div>
                          </div>
                          <div className={styles.modalFooterCenter}>
                            <button
                              className={styles.btnGhost}
                              onClick={closeConfirm}
                            >
                              Cancelar
                            </button>
                            <button
                              className={styles.btnPrimary}
                              onClick={onConfirmGenerate}
                            >
                              Sí, generar
                            </button>
                          </div>
                        </motion.div>
                      </div>
                    )}

                    <button
                      className={styles.editButton}
                      onClick={() => openEdit(discount)}
                      aria-label="Editar"
                    >
                      <Edit size={16} />
                    </button>
                  </div>
                </div>
              ))}

              {filtered.length === 0 && (
                <div className={styles.emptyState}>
                  No se encontraron resultados para “{searchTerm}”.
                </div>
              )}
            </div>
          </Card>
        </motion.div>
      </div>

      {genOpen && (
        <div className={styles.modalBackdrop} role="dialog" aria-modal="true">
          <motion.div
            className={`${styles.modal} ${styles.modalSmall}`}
            initial={{ opacity: 0, y: 8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ type: "spring", stiffness: 260, damping: 20 }}
          >
            <div className={styles.modalHeaderBar} />
            <div className={styles.modalBodyCenter}>
              {genStep === "loading" ? (
                <>
                  <Loader2 className={styles.spinner} size={44} />
                  <div className={styles.modalMessageStrong}>Generando…</div>
                  <div className={styles.modalHint}>
                    Estamos procesando tus descuentos
                  </div>
                </>
              ) : (
                <>
                  <CheckCircle className={styles.successIcon} size={48} />
                  <div className={styles.modalMessageStrong}>
                    Descuentos Generados Exitosamente
                  </div>
                </>
              )}
            </div>
            <div className={styles.modalFooterCenter}>
              {genStep === "done" ? (
                <button className={styles.btnPrimary} onClick={closeGenerate}>
                  Aceptar
                </button>
              ) : (
                <button className={styles.btnGhost} onClick={closeGenerate}>
                  Cancelar
                </button>
              )}
            </div>
          </motion.div>
        </div>
      )}

      {editOpen && (
        <div className={styles.modalBackdrop} role="dialog" aria-modal="true">
          <motion.div
            className={styles.modal}
            initial={{ opacity: 0, y: 8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ type: "spring", stiffness: 260, damping: 20 }}
          >
            <div className={styles.modalHeader}>
              <h4 className={styles.modalTitle}>Editar descuento</h4>
              <button
                className={styles.iconClose}
                onClick={closeEdit}
                aria-label="Cerrar"
              >
                ×
              </button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.formRow}>
                <label className={styles.label}>Precio</label>
                <input
                  className={styles.input}
                  inputMode="decimal"
                  type="number"
                  step="0.01"
                  min="0"
                  value={editPrice}
                  onChange={(e) => setEditPrice(e.target.value)}
                  placeholder="0,00"
                />
              </div>
              <div className={styles.formRow}>
                <label className={styles.label}>Porcentaje</label>
                <div className={styles.inputWithSuffix}>
                  <input
                    className={styles.input}
                    inputMode="decimal"
                    type="number"
                    step="0.1"
                    min="0"
                    max="100"
                    value={editPct}
                    onChange={(e) => setEditPct(e.target.value)}
                    placeholder="0"
                  />
                  <span className={styles.suffix}>%</span>
                </div>
              </div>
              {editError && <div className={styles.error}>{editError}</div>}
            </div>
            <div className={styles.modalFooter}>
              <button className={styles.btnGhost} onClick={closeEdit}>
                Cancelar
              </button>
              <button className={styles.btnPrimary} onClick={saveEdit}>
                Guardar
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default DiscountsList;
