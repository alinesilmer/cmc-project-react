"use client"

import type React from "react"
import styles from "./EmailConsentModal.module.scss"

type Props = {
  open: boolean
  insuranceName: string
  onAccept: () => void
  onCancel: () => void
}

const EmailConsentModal: React.FC<Props> = ({ open, insuranceName, onAccept, onCancel }) => {
  if (!open) return null

  return (
    <div className={styles.overlay} onClick={onCancel}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.iconWrapper}>
          <span className={styles.icon}>📧</span>
        </div>
        <h3 className={styles.title}>Compartir información de email</h3>
        <p className={styles.message}>
          <strong>{insuranceName}</strong> requiere que compartamos su dirección de correo electrónico para procesar su
          solicitud de padrón.
        </p>
        <p className={styles.submessage}>¿Está de acuerdo con compartir esta información?</p>
        <div className={styles.actions}>
          <button className={styles.cancelBtn} onClick={onCancel}>
            Cancelar
          </button>
          <button className={styles.acceptBtn} onClick={onAccept}>
            Aceptar
          </button>
        </div>
      </div>
    </div>
  )
}

export default EmailConsentModal
