// app/pages/DoctorProfile/DoctorProfilePage.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import Sidebar from "../../../components/molecules/Sidebar/Sidebar";
import Card from "../../../components/atoms/Card/Card";
import Button from "../../../components/atoms/Button/Button";
import styles from "./DoctorProfilePage.module.scss";

// Recharts
import {
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from "recharts";

// Types
type DoctorDocument = {
  id: string;
  label: string;
  fileName: string;
  url: string;
};
type DoctorProfile = {
  id: number;
  memberNumber: string;
  name: string;
  provincialReg: string;
  nationalReg: string;
  email?: string;
  phone?: string;
  specialty?: string;
  address?: string;
  hasDebt: boolean;
  debtDetail?: { amount: number; lastInvoice?: string; since?: string };
  documents: DoctorDocument[];
};

// Mock fetch — replace with real API call
async function fetchDoctorById(id: string): Promise<DoctorProfile | null> {
  const seed: DoctorProfile[] = [
    {
      id: 1,
      memberNumber: "001",
      name: "Dr. Juan Pérez",
      provincialReg: "MP001",
      nationalReg: "MN001",
      email: "juan.perez@colegiomedico.org",
      phone: "+54 379 412-3456",
      specialty: "Clínica Médica",
      address: "Av. Libertad 123, Corrientes",
      hasDebt: true,
      debtDetail: {
        amount: 48500,
        lastInvoice: "2025-07",
        since: "2025-06-01",
      },
      documents: [
        {
          id: "a1",
          label: "DNI",
          fileName: "dni_juan_perez.pdf",
          url: "/api/docs/dni_1",
        },
        {
          id: "a2",
          label: "Título",
          fileName: "titulo_juan_perez.pdf",
          url: "/api/docs/titulo_1",
        },
        {
          id: "a3",
          label: "Matrícula",
          fileName: "matricula_mp001.pdf",
          url: "/api/docs/matricula_1",
        },
      ],
    },
    {
      id: 2,
      memberNumber: "002",
      name: "Dra. María González",
      provincialReg: "MP002",
      nationalReg: "MN002",
      email: "maria.gonzalez@colegiomedico.org",
      phone: "+54 379 467-0011",
      specialty: "Ginecología",
      address: "Lavalle 456, Corrientes",
      hasDebt: false,
      documents: [
        {
          id: "b1",
          label: "DNI",
          fileName: "dni_maria_gonzalez.pdf",
          url: "/api/docs/dni_2",
        },
        {
          id: "b2",
          label: "Título",
          fileName: "titulo_maria_gonzalez.pdf",
          url: "/api/docs/titulo_2",
        },
      ],
    },
    {
      id: 3,
      memberNumber: "003",
      name: "Dr. Carlos Rodríguez",
      provincialReg: "MP003",
      nationalReg: "MN003",
      email: "c.rodriguez@colegiomedico.org",
      phone: "+54 379 455-7777",
      specialty: "Pediatría",
      address: "San Martín 789, Corrientes",
      hasDebt: false,
      documents: [
        {
          id: "c1",
          label: "DNI",
          fileName: "dni_carlos_rodriguez.pdf",
          url: "/api/docs/dni_3",
        },
        {
          id: "c2",
          label: "Matrícula",
          fileName: "matricula_mp003.pdf",
          url: "/api/docs/matricula_3",
        },
      ],
    },
  ];
  const match = seed.find((d) => d.id === Number(id));
  await new Promise((r) => setTimeout(r, 200));
  return match ?? null;
}

const currency = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  maximumFractionDigits: 0,
});

const DoctorProfilePage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [data, setData] = useState<DoctorProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [showDebtPopup, setShowDebtPopup] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!id) return;
      setLoading(true);
      const res = await fetchDoctorById(id);
      if (mounted) {
        setData(res);
        setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [id]);

  const hasDebt = data?.hasDebt;
  const debtInfo = data?.debtDetail;

  // Mock stats (replace with API)
  // Mock stats (replace with API)
  const stats = useMemo(
    () => [
      {
        month: "Mar",
        consultas: 18,
        facturado: 210000,
        obras: {
          iosc: 80000,
          sancor: 35000,
          medife: 25000,
          swiss: 20000,
          iosfa: 18000,
          unne: 22000,
          utn: 12000,
        },
      },
      {
        month: "Abr",
        consultas: 22,
        facturado: 255000,
        obras: {
          iosc: 90000,
          sancor: 40000,
          medife: 28000,
          swiss: 23000,
          iosfa: 20000,
          unne: 27000,
          utn: 17000,
        },
      },
      {
        month: "May",
        consultas: 19,
        facturado: 230000,
        obras: {
          iosc: 70000,
          sancor: 38000,
          medife: 26000,
          swiss: 21000,
          iosfa: 17000,
          unne: 30000,
          utn: 18000,
        },
      },
      {
        month: "Jun",
        consultas: 25,
        facturado: 298000,
        obras: {
          iosc: 95000,
          sancor: 45000,
          medife: 31000,
          swiss: 26000,
          iosfa: 19000,
          unne: 32000,
          utn: 20000,
        },
      },
      {
        month: "Jul",
        consultas: 21,
        facturado: 245500,
        obras: {
          iosc: 82000,
          sancor: 36000,
          medife: 24000,
          swiss: 22000,
          iosfa: 21000,
          unne: 26000,
          utn: 14500,
        },
      },
      {
        month: "Ago",
        consultas: 28,
        facturado: 332000,
        obras: {
          iosc: 110000,
          sancor: 50000,
          medife: 34000,
          swiss: 28000,
          iosfa: 25000,
          unne: 37000,
          utn: 28000,
        },
      },
    ],
    []
  );

  const handleDownloadAll = async () => {
    if (!data) return;
    if (hasDebt) {
      setShowDebtPopup(true);
      return;
    }
    for (const doc of data.documents) {
      const a = document.createElement("a");
      a.href = doc.url;
      a.download = doc.fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();
    }
  };

  return (
    <div className={styles.page}>
      <Sidebar />

      <div className={styles.content}>
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
        >
          <div className={styles.topbar}>
            <Button variant="ghost" onClick={() => navigate("/doctors")}>
              ← Volver
            </Button>
            <div />
          </div>

          {loading ? (
            <Card className={styles.loadingCard}>
              <div className={styles.loader} aria-label="Cargando perfil…" />
              <p>Cargando perfil…</p>
            </Card>
          ) : !data ? (
            <Card className={styles.errorCard}>
              <p>No se encontró el profesional solicitado.</p>
            </Card>
          ) : (
            <>
              <div className={styles.grid}>
                {/* Perfil + deuda */}
                <Card className={styles.infoCard}>
                  <div className={styles.infoHeader}>
                    <div className={styles.avatar}>{data.name.charAt(0)}</div>
                    <div>
                      <h2 className={styles.name}>{data.name}</h2>
                      <p className={styles.sub}>
                        Socio #{data.memberNumber} · MP {data.provincialReg} ·
                        MN {data.nationalReg}
                      </p>
                    </div>
                    <span
                      className={`${styles.badge} ${
                        hasDebt ? styles.debt : styles.ok
                      }`}
                    >
                      {hasDebt ? "Con deuda" : "Al día"}
                    </span>
                  </div>

                  <div className={styles.rows}>
                    <div>
                      <span className={styles.label}>Especialidad</span>
                      <p className={styles.value}>{data.specialty ?? "—"}</p>
                    </div>
                    <div>
                      <span className={styles.label}>Teléfono</span>
                      <p className={styles.value}>{data.phone ?? "—"}</p>
                    </div>
                    <div>
                      <span className={styles.label}>Email</span>
                      <p className={styles.value}>{data.email ?? "—"}</p>
                    </div>
                    <div>
                      <span className={styles.label}>Dirección</span>
                      <p className={styles.value}>{data.address ?? "—"}</p>
                    </div>
                  </div>

                  <div className={styles.debtSection}>
                    {hasDebt ? (
                      <div className={styles.debtBox}>
                        <div>
                          <span className={styles.label}>Monto adeudado</span>
                          <p className={styles.value}>
                            {debtInfo ? currency.format(debtInfo.amount) : "—"}
                          </p>
                        </div>
                        <div>
                          <span className={styles.label}>
                            Última liquidación
                          </span>
                          <p className={styles.value}>
                            {debtInfo?.lastInvoice ?? "—"}
                          </p>
                        </div>
                        <div>
                          <span className={styles.label}>En mora desde</span>
                          <p className={styles.value}>
                            {debtInfo?.since ?? "—"}
                          </p>
                        </div>
                        <Button
                          variant="primary"
                          onClick={() =>
                            alert("Ir a gestionar deuda / cobrar (TODO)")
                          }
                        >
                          Avisar de Deuda
                        </Button>
                      </div>
                    ) : (
                      <div className={styles.okBox}>
                        <p>El profesional se encuentra al día.</p>
                      </div>
                    )}
                  </div>
                </Card>

                {/* Documentación */}
                <Card className={styles.docsCard}>
                  <div className={styles.docsHeader}>
                    <h3 className={styles.sectionTitle}>Documentación</h3>
                    <Button variant="primary" onClick={handleDownloadAll}>
                      Descargar todo
                    </Button>
                  </div>

                  {data.documents.length === 0 ? (
                    <p className={styles.muted}>No hay documentos cargados.</p>
                  ) : (
                    <ul className={styles.docList}>
                      {data.documents.map((doc) => (
                        <li key={doc.id} className={styles.docItem}>
                          <div>
                            <p className={styles.docLabel}>{doc.label}</p>
                            <p className={styles.docName}>{doc.fileName}</p>
                          </div>
                          <div className={styles.docActions}>
                            <a
                              className={styles.downloadLink}
                              href={doc.url}
                              download
                            >
                              Descargar
                            </a>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => window.open(doc.url, "_blank")}
                            >
                              Ver
                            </Button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </Card>
              </div>

              {/* Estadísticas */}
              <div className={styles.gridWide}>
                <Card className={styles.statsCard}>
                  <div className={styles.statsHeader}>
                    <h3 className={styles.sectionTitle}>Estadísticas</h3>
                    <p className={styles.mutedSmall}>
                      Actividad reciente: consultas y facturación
                    </p>
                  </div>
                  <div className={styles.chartsWrap}>
                    <div className={styles.chartBox}>
                      <h4 className={styles.chartTitle}>Consultas por mes</h4>
                      <ResponsiveContainer width="100%" height={260}>
                        <BarChart data={stats}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="month" />
                          <YAxis />
                          <Tooltip />
                          <Bar dataKey="consultas" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>

                    <div className={styles.chartBox}>
                      <h4 className={styles.chartTitle}>
                        Obras sociales facturadas por mes
                      </h4>
                      <ResponsiveContainer width="100%" height={320}>
                        <LineChart data={stats}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="month" />
                          <YAxis />
                          <Tooltip />
                          <Line
                            type="monotone"
                            dataKey="obras.iosc"
                            name="IOSCOR"
                          />
                          <Line
                            type="monotone"
                            dataKey="obras.sancor"
                            name="Sancor"
                          />
                          <Line
                            type="monotone"
                            dataKey="obras.medife"
                            name="Medifé"
                          />
                          <Line
                            type="monotone"
                            dataKey="obras.swiss"
                            name="Swiss Medical"
                          />
                          <Line
                            type="monotone"
                            dataKey="obras.iosfa"
                            name="IOSFA"
                          />
                          <Line
                            type="monotone"
                            dataKey="obras.unne"
                            name="UNNE"
                          />
                          <Line
                            type="monotone"
                            dataKey="obras.utn"
                            name="UTN"
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </Card>
              </div>
            </>
          )}
        </motion.div>
      </div>

      {/* Styled debt pop-up */}
      <AnimatePresence>
        {showDebtPopup && (
          <div className={styles.portal}>
            <motion.div
              className={styles.overlay}
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.6 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setShowDebtPopup(false)}
            />
            <motion.div
              className={styles.popup}
              role="dialog"
              aria-modal="true"
              initial={{ opacity: 0, scale: 0.95, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 16 }}
              transition={{ type: "spring", stiffness: 240, damping: 22 }}
            >
              <h3 className={styles.popupTitle}>No es posible descargar</h3>
              <p className={styles.popupText}>
                Para descargar la documentación, primero debés{" "}
                <strong>regularizar tu deuda</strong>.
              </p>
              <div className={styles.popupButtons}>
                <Button
                  variant="primary"
                  onClick={() => {
                    setShowDebtPopup(false);
                    alert("Ir a gestionar deuda (TODO)");
                  }}
                >
                  Gestionar deuda
                </Button>
                <Button variant="ghost" onClick={() => setShowDebtPopup(false)}>
                  Cerrar
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default DoctorProfilePage;
