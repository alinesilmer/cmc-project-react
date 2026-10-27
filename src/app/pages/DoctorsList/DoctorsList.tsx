// app/pages/DoctorsList/DoctorsList.tsx
"use client";

import type React from "react";
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import Tabla from "@/app/components/ui/Tabla/Tabla";
import SearchField from "@/app/components/ui/SearchField/SearchField";
import Card from "@/app/components/ui/Card/Card";
import Button from "@/app/components/ui/Button/Button";
import styles from "./DoctorsList.module.scss";
import { listarMedicos, type DoctorRow } from "./doctorsList.api";
import BotonVer from "@/app/components/ui/BotonVer/BotonVer";
import { comoErrorApi } from "@/app/shared/lib/httpErrors";

const DoctorsList: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [rows, setRows] = useState<DoctorRow[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [err, setErr] = useState<string | null>(null);

  const navigate = useNavigate();

  useEffect(() => {
    let ignore = false;
    const controller = new AbortController();

    (async () => {
      setLoading(true);
      setErr(null);
      try {
        const params = searchTerm ? { q: searchTerm } : undefined;
        const data = await listarMedicos(params);
        if (!ignore) setRows(data);
      } catch (e) {
        const err = comoErrorApi(e);
        if (!ignore && err?.name !== "AbortError") setErr(err?.message || "No se pudieron cargar los médicos");
      } finally {
        if (!ignore) setLoading(false);
      }
    })();

    return () => { ignore = true; controller.abort(); };
  }, [searchTerm]);

  const filtered = useMemo(() => rows, [rows]);

  return (
    <div className={styles.doctorsPage}>
      <div className={styles.content}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className={styles.header}>
            <h1 className={styles.title}>Listado de médicos</h1>
            <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
              <SearchField
                placeholder="Buscar médico..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <Button
                variant="primary"
                onClick={() => navigate("/doctors/new")}
              >
                Agregar médico
              </Button>
            </div>
          </div>

          <Card className={styles.tableCard}>
            <div className={styles.tablaScroll}>
              <Tabla aria-label="Listado de médicos">
                <thead>
                  <tr>
                    <th>Nro socio</th>
                    <th>Nombre</th>
                    <th>Matrícula prov.</th>
                    <th>DNI</th>
                    <th className={styles.aLaDerecha}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={5} className={styles.estadoTabla}>
                        Cargando…
                      </td>
                    </tr>
                  ) : err ? (
                    <tr>
                      <td colSpan={5} className={`${styles.estadoTabla} ${styles.estadoError}`}>
                        {err}
                      </td>
                    </tr>
                  ) : filtered.length === 0 ? (
                    <tr>
                      <td colSpan={5} className={styles.estadoTabla}>
                        No se encontraron médicos.
                      </td>
                    </tr>
                  ) : (
                    filtered.map((doctor) => (
                      <tr key={doctor.id}>
                        <td>{doctor.nro_socio}</td>
                        <td>{doctor.nombre}</td>
                        <td>{doctor.matricula_prov}</td>
                        <td>{doctor.documento}</td>
                        <td className={styles.aLaDerecha}>
                          <BotonVer onClick={() => navigate(`/doctors/${doctor.id}`)} />
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </Tabla>
            </div>
          </Card>
        </motion.div>
      </div>
    </div>
  );
};

export default DoctorsList;
