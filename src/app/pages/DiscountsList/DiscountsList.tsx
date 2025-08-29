"use client";

import type React from "react";
import { useState } from "react";
import { motion } from "framer-motion";
import { Edit } from "lucide-react";
import Sidebar from "../../../components/molecules/Sidebar/Sidebar";
import SearchBar from "../../../components/molecules/SearchBar/SearchBar";
import Card from "../../../components/atoms/Card/Card";
import Button from "../../../components/atoms/Button/Button";
import styles from "./DiscountsList.module.scss";

const DiscountsList: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState("");

  const discounts = [
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
  ];

  return (
    <div className={styles.discountsPage}>
      <Sidebar />

      <div className={styles.content}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className={styles.header}>
            <div>
              <h1 className={styles.title}>Listado de Descuentos</h1>
              <p className={styles.subtitle}>
                Administra y genera descuentos rápidamente
              </p>
            </div>
            <SearchBar
              placeholder="Buscar..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
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

              {discounts.map((discount) => (
                <div key={discount.id} className={styles.tableRow}>
                  <div>{discount.id}</div>
                  <div>{discount.concept}</div>
                  <div>${discount.price}</div>
                  <div>{discount.percentage}%</div>
                  <div className={styles.actions}>
                    <Button size="sm" variant="primary">
                      Generar
                    </Button>
                    <button className={styles.editButton}>
                      <Edit size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </motion.div>
      </div>
    </div>
  );
};

export default DiscountsList;
