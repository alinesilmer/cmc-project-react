// app/pages/DoctorsList/DoctorsList.tsx
"use client";

import type React from "react";
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import SearchBar from "../../../components/molecules/SearchBar/SearchBar";
import Card from "../../../components/atoms/Card/Card";
import Button from "../../../components/atoms/Button/Button";
import styles from "./DoctorsList.module.scss";
import { getJSON } from "../../../lib/http";

type DoctorRow = {
  id: number;
  nro_socio: number;
  nombre: string;
  matricula_prov: number;
  documento: string;
};


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
        const data = await getJSON<DoctorRow[]>("/api/medicos", params);
        if (!ignore) setRows(data);
      } catch (e: any) {
        if (!ignore && e?.name !== "AbortError") setErr(e?.message || "No se pudieron cargar los médicos");
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
            <div className={styles.actionsRight}>
              <SearchBar
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
            <div className={styles.table}>
              <div className={styles.tableHeader}>
                <div>NRO SOCIO</div>
                <div>NOMBRE</div>
                <div>MATRÍCULA PROV.</div>
                <div>DNI</div>
                <div>ACCIONES</div>
              </div>

              {loading ? (
                <div className={styles.loading}>Cargando…</div>
              ) : err ? (
                <div className={styles.emptyState}>{err}</div>
              ) : filtered.length === 0 ? (
                <div className={styles.emptyState}>
                  No se encontraron médicos.
                </div>
              ) : (
                filtered.map((doctor) => (
                  <div key={doctor.id} className={styles.tableRow}>
                    <div>{doctor.nro_socio}</div>
                    <div className={styles.nameCell}>{doctor.nombre}</div>
                    <div>{doctor.matricula_prov}</div>
                    <div>{doctor.documento}</div>
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
