"use client";

import type React from "react";
import { motion } from "framer-motion";
import Sidebar from "../../../components/molecules/Sidebar/Sidebar";
import SearchBar from "../../../components/molecules/SearchBar/SearchBar";
import Card from "../../../components/atoms/Card/Card";
import styles from "./SocialWorkSection.module.scss";

const SocialWorkSelection: React.FC = () => {
  const socialWorks = [
    {
      id: 1,
      name: "Sancor",
      logo: "https://placeholder.svg?height=60&width=120&text=SanCor",
    },
    {
      id: 2,
      name: "MEDIFÉ",
      logo: "https://placeholder.svg?height=60&width=120&text=MEDIFÉ",
    },
    {
      id: 3,
      name: "OSDE",
      logo: "https://placeholder.svg?height=60&width=120&text=OSDE",
    },
    {
      id: 4,
      name: "IOMA",
      logo: "https://placeholder.svg?height=60&width=120&text=IOMA",
    },
    {
      id: 5,
      name: "Swiss Medical",
      logo: "https://placeholder.svg?height=60&width=120&text=Swiss",
    },
    {
      id: 6,
      name: "OSECAC",
      logo: "https://placeholder.svg?height=60&width=120&text=OSECAC",
    },
  ];

  return (
    <div className={styles.socialWorkPage}>
      <Sidebar />

      <div className={styles.content}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className={styles.header}>
            <h1 className={styles.title}>Seleccione la Obra Social</h1>
            <SearchBar placeholder="Buscar obra social..." />
          </div>

          <div className={styles.socialWorksGrid}>
            {socialWorks.map((socialWork, index) => (
              <motion.div
                key={socialWork.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3, delay: index * 0.1 }}
              >
                <Card hoverable className={styles.socialWorkCard}>
                  <div className={styles.logoContainer}>
                    <img
                      src={socialWork.logo || "/placeholder.svg"}
                      alt={socialWork.name}
                      className={styles.logo}
                    />
                  </div>
                  <h3 className={styles.socialWorkName}>{socialWork.name}</h3>
                </Card>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default SocialWorkSelection;
