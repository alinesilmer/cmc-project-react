// app/pages/DoctorsList/DoctorsList.tsx
"use client";

import type React from "react";
import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import Sidebar from "../../../components/molecules/Sidebar/Sidebar";
import SearchBar from "../../../components/molecules/SearchBar/SearchBar";
import Card from "../../../components/atoms/Card/Card";
import Button from "../../../components/atoms/Button/Button";
import styles from "./DoctorsList.module.scss";

type DoctorRow = {
  id: number;
  memberNumber: string;
  name: string;
  provincialReg: string;
  nationalReg: string;
  hasDebt?: boolean;
};

const DoctorsList: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const navigate = useNavigate();

  const doctors: DoctorRow[] = [
    {
      id: 1,
      memberNumber: "001",
      name: "Dr. Juan Pérez",
      provincialReg: "MP001",
      nationalReg: "MN001",
      hasDebt: true,
    },
    {
      id: 2,
      memberNumber: "002",
      name: "Dra. María González",
      provincialReg: "MP002",
      nationalReg: "MN002",
      hasDebt: false,
    },
    {
      id: 3,
      memberNumber: "003",
      name: "Dr. Carlos Rodríguez",
      provincialReg: "MP003",
      nationalReg: "MN003",
      hasDebt: false,
    },
  ];

  const filtered = useMemo(() => {
    const t = searchTerm.toLowerCase().trim();
    return !t
      ? doctors
      : doctors.filter((d) =>
          [d.memberNumber, d.name, d.provincialReg, d.nationalReg].some((v) =>
            v.toLowerCase().includes(t)
          )
        );
  }, [searchTerm]);

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

              {filtered.length === 0 ? (
                <div className={styles.emptyState}>
                  No se encontraron médicos o hubo un error de conexión.
                </div>
              ) : (
                filtered.map((doctor) => (
                  <div key={doctor.id} className={styles.tableRow}>
                    <div>{doctor.memberNumber}</div>
                    <div className={styles.nameCell}>{doctor.name}</div>
                    <div>{doctor.provincialReg}</div>
                    <div>{doctor.nationalReg}</div>
                    <div className={styles.actions}>
                      <Button
                        size="sm"
                        variant="primary"
                        onClick={() => navigate(`/doctors/${doctor.id}`)}
                      >
                        Ver
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
