"use client"
import type React from "react"
import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import styles from "./AdminPadrones.module.scss"
import BackButton from "../../components/atoms/BackButton/BackButton"

type PadronStatus = "pending" | "approved" | "rejected"

type PadronSubmission = {
  id: number
  medico_id: number
  medico_name: string
  medico_email: string
  submitted_date: string
  status: PadronStatus
  selected_insurances: string[] // Array of insurance names
  insurance_count: number
}

const AdminPadrones: React.FC = () => {
  const navigate = useNavigate()
  const [padrones, setPadrones] = useState<PadronSubmission[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeFilter, setActiveFilter] = useState<PadronStatus | "all">("all")

  useEffect(() => {
    // TODO: Replace with actual API call
    // Simulated API call
    const fetchPadrones = async () => {
      try {
        setLoading(true)
        // const response = await getJSON<PadronSubmission[]>("/api/padrones");

        // Mock data for demonstration
        const mockData: PadronSubmission[] = [
          {
            id: 1,
            medico_id: 101,
            medico_name: "Dr. Juan Pérez",
            medico_email: "juan.perez@email.com",
            submitted_date: "2025-01-15",
            status: "pending",
            selected_insurances: ["GALENO", "SWISS MEDICAL", "MEDICUS"],
            insurance_count: 3,
          },
          {
            id: 2,
            medico_id: 102,
            medico_name: "Dra. María González",
            medico_email: "maria.gonzalez@email.com",
            submitted_date: "2025-01-14",
            status: "approved",
            selected_insurances: ["OSDE", "UNNE", "OMINT SA"],
            insurance_count: 3,
          },
          {
            id: 3,
            medico_id: 103,
            medico_name: "Dr. Carlos Rodríguez",
            medico_email: "carlos.rodriguez@email.com",
            submitted_date: "2025-01-13",
            status: "pending",
            selected_insurances: ["MEDIFE", "GALENO"],
            insurance_count: 2,
          },
        ]

        setPadrones(mockData)
        setError(null)
      } catch (err: any) {
        setError(err?.message || "Error al cargar las solicitudes de padrones")
      } finally {
        setLoading(false)
      }
    }

    fetchPadrones()
  }, [])

  const filteredPadrones = padrones.filter((padron) => (activeFilter === "all" ? true : padron.status === activeFilter))

  const getStatusLabel = (status: PadronStatus): string => {
    const labels: Record<PadronStatus, string> = {
      pending: "Pendiente",
      approved: "Aprobada",
      rejected: "Rechazada",
    }
    return labels[status]
  }

  const getStatusColor = (status: PadronStatus): string => {
    const colors: Record<PadronStatus, string> = {
      pending: styles.statusPending,
      approved: styles.statusApproved,
      rejected: styles.statusRejected,
    }
    return colors[status]
  }

  const formatDate = (dateStr: string): string => {
    const [y, m, d] = dateStr.split("-").map(Number)
    const date = new Date(y, (m ?? 1) - 1, d ?? 1, 12, 0, 0, 0)
    return date.toLocaleDateString("es-AR", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    })
  }

  return (
    <div className={styles.container}>
      <BackButton />

      <div className={styles.header}>
        <h1 className={styles.title}>Solicitudes de Padrones</h1>
        <p className={styles.subtitle}>Revisá y gestioná las solicitudes de obras sociales de los médicos</p>
      </div>

      <div className={styles.filters}>
        <button
          className={`${styles.filterButton} ${activeFilter === "all" ? styles.active : ""}`}
          onClick={() => setActiveFilter("all")}
        >
          Todas
        </button>
        <button
          className={`${styles.filterButton} ${activeFilter === "pending" ? styles.active : ""}`}
          onClick={() => setActiveFilter("pending")}
        >
          <span className={styles.dot} style={{ backgroundColor: "#f59e0b" }} />
          Pendientes
        </button>
        <button
          className={`${styles.filterButton} ${activeFilter === "approved" ? styles.active : ""}`}
          onClick={() => setActiveFilter("approved")}
        >
          <span className={styles.dot} style={{ backgroundColor: "#21b356" }} />
          Aprobadas
        </button>
        <button
          className={`${styles.filterButton} ${activeFilter === "rejected" ? styles.active : ""}`}
          onClick={() => setActiveFilter("rejected")}
        >
          <span className={styles.dot} style={{ backgroundColor: "#ef4444" }} />
          Rechazadas
        </button>
      </div>

      {loading && <div className={styles.loading}>Cargando solicitudes...</div>}

      {error && <div className={styles.error}>{error}</div>}

      {!loading && !error && (
        <>
          <div className={styles.cardsGrid}>
            {filteredPadrones.map((padron) => (
              <div key={padron.id} className={styles.card}>
                <div className={styles.cardHeader}>
                  <div className={styles.doctorInfo}>
                    <div className={styles.avatar}>{padron.medico_name.charAt(0)}</div>
                    <div>
                      <h3 className={styles.doctorName}>{padron.medico_name}</h3>
                      <p className={styles.doctorEmail}>{padron.medico_email}</p>
                    </div>
                  </div>
                  <span className={`${styles.statusBadge} ${getStatusColor(padron.status)}`}>
                    {getStatusLabel(padron.status)}
                  </span>
                </div>

                <div className={styles.cardBody}>
                  <div className={styles.infoRow}>
                    <span className={styles.label}>Obras Sociales:</span>
                    <span className={styles.value}>{padron.insurance_count}</span>
                  </div>
                  <div className={styles.infoRow}>
                    <span className={styles.label}>Fecha de envío:</span>
                    <span className={styles.value}>{formatDate(padron.submitted_date)}</span>
                  </div>
                  <div className={styles.insurancePreview}>
                    {padron.selected_insurances.slice(0, 3).map((ins, idx) => (
                      <span key={idx} className={styles.insuranceTag}>
                        {ins}
                      </span>
                    ))}
                    {padron.insurance_count > 3 && (
                      <span className={styles.insuranceTag}>+{padron.insurance_count - 3} más</span>
                    )}
                  </div>
                </div>

                <div className={styles.cardFooter}>
                  <button className={styles.reviewButton} onClick={() => navigate(`/panel/admin-padrones/${padron.id}`)}>
                    Revisar Solicitud
                  </button>
                </div>
              </div>
            ))}
          </div>

          {filteredPadrones.length === 0 && (
            <div className={styles.emptyState}>
              <p>
                No hay solicitudes de padrones{" "}
                {activeFilter !== "all" && `en estado "${getStatusLabel(activeFilter as PadronStatus)}"`}
              </p>
            </div>
          )}
        </>
      )}
    </div>
  )
}

export default AdminPadrones
