"use client";

import type React from "react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { Application, ApplicationStatus } from "../../../types/types";
import styles from "./ApplicationsList.module.scss";
import { getJSON } from "../../../lib/http";
import SearchBar from "../SearchBar/SearchBar";
import BackButton from "../../atoms/BackButton/BackButton";

export type ApplicationFromApi = {
  id: number;
  medico_id: number;
  name: string;
  email?: string | null;
  phone?: string | null;
  status: ApplicationStatus;
  submitted_date: string; // ISO
  member_type?: string | null;
  join_date?: string | null;
  observations?: string | null;
};

async function listSolicitudes(params?: {
  estado?: "todas" | ApplicationStatus;
  q?: string;
  skip?: number;
  limit?: number;
}) {
  return await getJSON<ApplicationFromApi[]>("/api/solicitudes/", params);
}

const ApplicationsList: React.FC = () => {
  const navigate = useNavigate();

  const [activeFilter, setActiveFilter] = useState<ApplicationStatus | "todas">(
    "todas"
  );
  const [apps, setApps] = useState<Application[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [q, setQ] = useState("");

  useEffect(() => {
    let ignore = false;
    (async () => {
      setLoading(true);
      setErr(null);
      try {
        const data = await listSolicitudes({
          estado: activeFilter,
          q: q || undefined,
          limit: 100,
          skip: 0,
        });
        if (ignore) return;

        const mapped: Application[] = (data || []).map((r) => ({
          id: String(r.id),
          name: r.name,
          email: r.email || undefined,
          phone: r.phone || undefined,
          status: r.status,
          submittedDate: r.submitted_date?.slice(0, 10), // ISO → YYYY-MM-DD
          memberType: r.member_type || undefined,
          joinDate: r.join_date || undefined,
          observations: r.observations || undefined,
        }));
        setApps(mapped);
      } catch (e: any) {
        if (!ignore)
          setErr(e?.message || "No se pudieron cargar las solicitudes");
      } finally {
        if (!ignore) setLoading(false);
      }
    })();
    return () => {
      ignore = true;
    };
  }, [activeFilter, q]);

  const filtered = useMemo(() => apps, [apps]); // el back ya filtra por estado y q

  const getStatusLabel = (status: ApplicationStatus): string => {
    const labels: Record<ApplicationStatus, string> = {
      nueva: "Nueva",
      pendiente: "Pendiente",
      aprobada: "Aprobada",
      rechazada: "Rechazada",
    };
    return labels[status];
  };

  const getCardColor = (status: ApplicationStatus): string => {
    const colors: Record<ApplicationStatus, string> = {
      nueva: styles.cardYellow,
      pendiente: styles.cardBlue,
      aprobada: styles.cardGreen,
      rechazada: styles.cardRed,
    };
    return colors[status];
  };

  const formatDateYMD = (ymd: string): string => {
    const [y, m, d] = ymd.split("-").map(Number);
    // Creamos la fecha en horario local (mediodía para evitar DST edge cases)
    const local = new Date(y, (m ?? 1) - 1, d ?? 1, 12, 0, 0, 0);
    return local.toLocaleDateString("es-AR", {
      day: "2-digit",
      month: "long",
      timeZone: "America/Argentina/Buenos_Aires",
    });
  };

  return (
    <div className={styles.container}>
      <BackButton />
      <div className={styles.header}>
        <h1 className={styles.title}>Solicitudes de Socios</h1>
      </div>

      <div className={styles.toolbar}>
        <div className={styles.filters}>
          <button
            className={`${styles.filterButton} ${
              activeFilter === "todas" ? styles.active : ""
            }`}
            onClick={() => setActiveFilter("todas")}
          >
            Todas
          </button>
          <button
            className={`${styles.filterButton} ${
              activeFilter === "nueva" ? styles.active : ""
            }`}
            onClick={() => setActiveFilter("nueva")}
          >
            <span
              className={styles.dot}
              style={{ backgroundColor: "#f59e0b" }}
            />
            Nuevas
          </button>
          <button
            className={`${styles.filterButton} ${
              activeFilter === "pendiente" ? styles.active : ""
            }`}
            onClick={() => setActiveFilter("pendiente")}
          >
            <span
              className={styles.dot}
              style={{ backgroundColor: "#4f7cff" }}
            />
            Pendientes
          </button>
          <button
            className={`${styles.filterButton} ${
              activeFilter === "aprobada" ? styles.active : ""
            }`}
            onClick={() => setActiveFilter("aprobada")}
          >
            <span
              className={styles.dot}
              style={{ backgroundColor: "#21b356" }}
            />
            Aprobadas
          </button>
          <button
            className={`${styles.filterButton} ${
              activeFilter === "rechazada" ? styles.active : ""
            }`}
            onClick={() => setActiveFilter("rechazada")}
          >
            <span
              className={styles.dot}
              style={{ backgroundColor: "#ef4444" }}
            />
            Rechazadas
          </button>
        </div>

        <div className={styles.searchBox}>
          <SearchBar
            placeholder="Buscar por nombre, email o documento..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
      </div>

      {loading && <div className={styles.loading}>Cargando…</div>}
      {err && <div className={styles.error}>{err}</div>}

      {!loading && !err && (
        <>
          <div className={styles.cardsGrid}>
            {filtered.map((application) => (
              <div
                key={application.id}
                className={`${styles.card} ${getCardColor(
                  application.status
                )} fade-in`}
              >
                <div className={styles.cardImage}>
                  <div className={styles.avatarPlaceholder}>
                    {application.name?.charAt(0) || "?"}
                  </div>
                </div>

                <div className={styles.cardContent}>
                  <h3 className={styles.cardTitle}>{application.name}</h3>
                  <p className={styles.cardDescription}>{application.email}</p>

                  <div className={styles.cardTags}>
                    <span className={styles.tag}>
                      {getStatusLabel(application.status)}
                    </span>
                    {application.memberType && (
                      <span className={styles.tag}>
                        {application.memberType}
                      </span>
                    )}
                  </div>

                  <div className={styles.cardFooter}>
                    <div className={styles.dateInfo}>
                      <span className={styles.dateLabel}>Enviada</span>
                      <span className={styles.dateValue}>
                        {application.submittedDate
                          ? formatDateYMD(application.submittedDate)
                          : "-"}
                      </span>
                    </div>
                    <button
                      className={styles.viewButton}
                      onClick={() => navigate(`/solicitudes/${application.id}`)}
                    >
                      Ver Solicitud
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {filtered.length === 0 && (
            <div className={styles.emptyState}>
              <p>
                No hay solicitudes{" "}
                {activeFilter !== "todas"
                  ? `en estado "${
                      activeFilter.charAt(0).toUpperCase() +
                      activeFilter.slice(1)
                    }"`
                  : ""}
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default ApplicationsList;
