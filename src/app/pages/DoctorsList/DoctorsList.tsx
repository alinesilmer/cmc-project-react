"use client";

import type React from "react";
import { useState } from "react";
import { motion } from "framer-motion";
import Sidebar from "../../../components/molecules/Sidebar/Sidebar";
import SearchBar from "../../../components/molecules/SearchBar/SearchBar";
import Card from "../../../components/atoms/Card/Card";
import Button from "../../../components/atoms/Button/Button";
import styles from "./DoctorsList.module.scss";

const DoctorsList: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState("");

  const doctors = [
    {
      id: 1,
      memberNumber: "001",
      name: "Dr. Juan Pérez",
      provincialReg: "MP001",
      nationalReg: "MN001",
    },
    {
      id: 2,
      memberNumber: "002",
      name: "Dra. María González",
      provincialReg: "MP002",
      nationalReg: "MN002",
    },
    {
      id: 3,
      memberNumber: "003",
      name: "Dr. Carlos Rodríguez",
      provincialReg: "MP003",
      nationalReg: "MN003",
    },
  ];

  return (
    <div className={styles.doctorsPage}>
      <Sidebar />

      <div className={styles.content}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className={styles.header}>
            <h1 className={styles.title}>Listado de médicos</h1>
            <SearchBar
              placeholder="Buscar médico..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <Card className={styles.tableCard}>
            <div className={styles.table}>
              <div className={styles.tableHeader}>
                <div>NRO SOCIO</div>
                <div>NOMBRE</div>
                <div>MATRÍCULA PROV.</div>
                <div>MATRÍCULA NAC.</div>
                <div>ACCIONES</div>
              </div>

              {doctors.length === 0 ? (
                <div className={styles.emptyState}>
                  No se encontraron médicos o hubo un error de conexión.
                </div>
              ) : (
                doctors.map((doctor) => (
                  <div key={doctor.id} className={styles.tableRow}>
                    <div>{doctor.memberNumber}</div>
                    <div>{doctor.name}</div>
                    <div>{doctor.provincialReg}</div>
                    <div>{doctor.nationalReg}</div>
                    <div className={styles.actions}>
                      <Button size="sm" variant="outline">
                        Ver
                      </Button>
                      <Button size="sm" variant="primary">
                        Editar
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>
        </motion.div>
      </div>
    </div>
  );
};

export default DoctorsList;
