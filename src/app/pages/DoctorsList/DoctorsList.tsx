// app/pages/DoctorsList/DoctorsList.tsx
"use client";

import type React from "react";
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from "../../components/atoms/Table/Table";
import SearchField from "../../components/molecules/SearchField/SearchField";
import Card from "../../components/atoms/Card/Card";
import Button from "../../components/atoms/Button/Button";
import styles from "./DoctorsList.module.scss";
import { getJSON } from "../../lib/http";

type DoctorRow = {
  id: number;
  nro_socio: number;
  nombre: string;
  matricula_prov: number;
  documento: string;
};

const headCellSx = {
  backgroundColor: "#f1f5f9",
  color: "#334155",
  fontWeight: 600,
  fontSize: "0.76rem",
  textTransform: "uppercase",
  letterSpacing: "0.5px",
  borderBottom: "none",
} as const;

const bodyCellSx = {
  fontSize: "0.86rem",
  color: "#0f172a",
  borderBottom: "1px solid #e2e8f0",
} as const;

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
            <TableContainer>
              <Table size="small" aria-label="Listado de médicos">
                <TableHead>
                  <TableRow>
                    <TableCell sx={headCellSx}>Nro socio</TableCell>
                    <TableCell sx={headCellSx}>Nombre</TableCell>
                    <TableCell sx={headCellSx}>Matrícula prov.</TableCell>
                    <TableCell sx={headCellSx}>DNI</TableCell>
                    <TableCell sx={headCellSx} align="right">Acciones</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={5} align="center" sx={{ ...bodyCellSx, py: 4, color: "#64748b" }}>
                        Cargando…
                      </TableCell>
                    </TableRow>
                  ) : err ? (
                    <TableRow>
                      <TableCell colSpan={5} align="center" sx={{ ...bodyCellSx, py: 4, color: "#cc2a2a", fontStyle: "italic" }}>
                        {err}
                      </TableCell>
                    </TableRow>
                  ) : filtered.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} align="center" sx={{ ...bodyCellSx, py: 6, color: "#64748b", fontStyle: "italic" }}>
                        No se encontraron médicos.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filtered.map((doctor) => (
                      <TableRow
                        key={doctor.id}
                        hover
                        sx={{ "&:hover": { backgroundColor: "#f8fafc" } }}
                      >
                        <TableCell sx={bodyCellSx}>{doctor.nro_socio}</TableCell>
                        <TableCell sx={bodyCellSx}>{doctor.nombre}</TableCell>
                        <TableCell sx={bodyCellSx}>{doctor.matricula_prov}</TableCell>
                        <TableCell sx={bodyCellSx}>{doctor.documento}</TableCell>
                        <TableCell sx={bodyCellSx} align="right">
                          <Button
                            size="sm"
                            variant="primary"
                            onClick={() => navigate(`/doctors/${doctor.id}`)}
                          >
                            Ver
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Card>
        </motion.div>
      </div>
    </div>
  );
};

export default DoctorsList;
