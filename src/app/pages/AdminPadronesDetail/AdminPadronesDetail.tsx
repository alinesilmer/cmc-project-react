"use client"
import type React from "react"
import { useEffect, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import styles from "./AdminPadronesDetail.module.scss"
import BackButton from "../../components/atoms/BackButton/BackButton"

type PadronStatus = "pending" | "approved" | "rejected"

type Insurance = {
  id: string
  name: string
  code: string
}

type PadronDetail = {
  id: number
  medico_id: number
  medico_name: string
  medico_email: string
  medico_phone: string
  submitted_date: string
  status: PadronStatus
  selected_insurances: Insurance[]
  rejection_reason?: string
}

const AdminPadronesDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [padron, setPadron] = useState<PadronDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showRejectModal, setShowRejectModal] = useState(false)
  const [rejectionReason, setRejectionReason] = useState("")
  const [processing, setProcessing] = useState(false)

  useEffect(() => {
    // TODO: Replace with actual API call
    const fetchPadronDetail = async () => {
      try {
        setLoading(true)
        // const response = await getJSON<PadronDetail>(`/api/padrones/${id}`);

        // Mock data
        const mockData: PadronDetail = {
          id: Number(id),
          medico_id: 101,
          medico_name: "Dr. Juan Pérez",
          medico_email: "juan.perez@email.com",
          medico_phone: "+54 379 4567890",
          submitted_date: "2025-01-15",
          status: "pending",
          selected_insurances: [
            { id: "10", name: "GALENO", code: "OS010" },
            { id: "56", name: "SWISS MEDICAL", code: "OS056" },
            { id: "16", name: "MEDICUS", code: "OS016" },
            { id: "23", name: "OMINT SA", code: "OS023" },
            { id: "17", name: "MEDIFE", code: "OS017" },
          ],
        }

        setPadron(mockData)
        setError(null)
      } catch (err: any) {
        setError(err?.message || "Error al cargar la solicitud")
      } finally {
        setLoading(false)
      }
    }

    fetchPadronDetail()
  }, [id])

  const handleDownloadPDF = () => {
    // TODO: Implement PDF download
    alert("Descargando PDF...")
    console.log("Download PDF for padron:", id)
  }

  const handleDownloadExcel = () => {
    // TODO: Implement Excel download
    alert("Descargando Excel...")
    console.log("Download Excel for padron:", id)
  }

  const handleApprove = async () => {
    if (!padron) return

    setProcessing(true)
    try {
      // TODO: Implement approve API call
      // await postJSON(`/api/padrones/${id}/approve`, {});

      alert("Solicitud aprobada exitosamente")
      navigate("/panel/padrones")
    } catch (err: any) {
      alert(err?.message || "Error al aprobar la solicitud")
    } finally {
      setProcessing(false)
    }
  }

  const handleReject = async () => {
    if (!padron || !rejectionReason.trim()) {
      alert("Por favor, ingrese un motivo de rechazo")
      return
    }

    setProcessing(true)
    try {
      // TODO: Implement reject API call
      // await postJSON(`/api/padrones/${id}/reject`, { reason: rejectionReason });

      alert("Solicitud rechazada")
      navigate("/panel/padrones")
    } catch (err: any) {
      alert(err?.message || "Error al rechazar la solicitud")
    } finally {
      setProcessing(false)
      setShowRejectModal(false)
    }
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

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Cargando solicitud...</div>
      </div>
    )
  }

  if (error || !padron) {
    return (
      <div className={styles.container}>
        <BackButton />
        <div className={styles.error}>{error || "Solicitud no encontrada"}</div>
      </div>
    )
  }

  return (
    <div className={styles.container}>
      <BackButton />

      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Solicitud de Padrón</h1>
          <p className={styles.subtitle}>ID: #{padron.id}</p>
        </div>
        <div className={styles.downloadButtons}>
          <button className={styles.downloadBtn} onClick={handleDownloadPDF}>
            📄 Descargar PDF
          </button>
          <button className={styles.downloadBtn} onClick={handleDownloadExcel}>
            📊 Descargar Excel
          </button>
        </div>
      </div>

      <div className={styles.content}>
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <h2>Información del Médico</h2>
          </div>
          <div className={styles.cardBody}>
            <div className={styles.infoGrid}>
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>Nombre</span>
                <span className={styles.infoValue}>{padron.medico_name}</span>
              </div>
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>Email</span>
                <span className={styles.infoValue}>{padron.medico_email}</span>
              </div>
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>Teléfono</span>
                <span className={styles.infoValue}>{padron.medico_phone}</span>
              </div>
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>Fecha de envío</span>
                <span className={styles.infoValue}>{formatDate(padron.submitted_date)}</span>
              </div>
            </div>
          </div>
        </div>

        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <h2>Obras Sociales Seleccionadas</h2>
            <span className={styles.count}>{padron.selected_insurances.length} obras sociales</span>
          </div>
          <div className={styles.cardBody}>
            <div className={styles.insuranceGrid}>
              {padron.selected_insurances.map((insurance) => (
                <div key={insurance.id} className={styles.insuranceCard}>
                  <span className={styles.insuranceName}>{insurance.name}</span>
                  <span className={styles.insuranceCode}>Código: {insurance.code}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {padron.status === "pending" && (
          <div className={styles.actionsCard}>
            <h3>Acciones</h3>
            <p className={styles.actionsDescription}>
              Revisá la información y decidí si aprobar o rechazar esta solicitud
            </p>
            <div className={styles.actions}>
              <button className={styles.rejectBtn} onClick={() => setShowRejectModal(true)} disabled={processing}>
                Rechazar
              </button>
              <button className={styles.approveBtn} onClick={handleApprove} disabled={processing}>
                {processing ? "Procesando..." : "Aprobar"}
              </button>
            </div>
          </div>
        )}

        {padron.status === "approved" && (
          <div className={styles.statusCard}>
            <div className={styles.statusIcon}>✅</div>
            <h3>Solicitud Aprobada</h3>
            <p>Esta solicitud fue aprobada el {formatDate(padron.submitted_date)}</p>
          </div>
        )}

        {padron.status === "rejected" && (
          <div className={styles.statusCard}>
            <div className={styles.statusIcon}>❌</div>
            <h3>Solicitud Rechazada</h3>
            {padron.rejection_reason && (
              <div className={styles.rejectionReason}>
                <strong>Motivo:</strong> {padron.rejection_reason}
              </div>
            )}
          </div>
        )}
      </div>

      {showRejectModal && (
        <div className={styles.modalOverlay} onClick={() => setShowRejectModal(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h3 className={styles.modalTitle}>Rechazar Solicitud</h3>
            <p className={styles.modalDescription}>
              Por favor, indique el motivo del rechazo. Esta información será comunicada al médico.
            </p>
            <textarea
              className={styles.textarea}
              placeholder="Escribe el motivo del rechazo..."
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              rows={5}
            />
            <div className={styles.modalActions}>
              <button className={styles.modalCancelBtn} onClick={() => setShowRejectModal(false)} disabled={processing}>
                Cancelar
              </button>
              <button
                className={styles.modalConfirmBtn}
                onClick={handleReject}
                disabled={processing || !rejectionReason.trim()}
              >
                {processing ? "Procesando..." : "Confirmar Rechazo"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default AdminPadronesDetail
