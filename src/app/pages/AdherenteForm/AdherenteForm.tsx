"use client";
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import styles from "./AdherenteForm.module.scss";
import BackButton from "@/app/components/ui/BackButton/BackButton";
import SuccessModal from "@/app/components/ui/SuccessModal/SuccessModal";

/* Lightweight reject modal (inline so you don't need a new file) */
type RejectProps = {
  open: boolean;
  title: string;
  message: string;
  onClose: () => void;
};
const RejectModal: React.FC<RejectProps> = ({
  open,
  title,
  message,
  onClose,
}) => {
  if (!open) return null;
  return (
    <div
      className={styles.modalOverlay}
      role="dialog"
      aria-modal="true"
      aria-labelledby="reject-title"
    >
      <div className={styles.modalCard}>
        <h3 id="reject-title" className={styles.modalTitle}>
          {title}
        </h3>
        <p className={styles.modalText}>{message}</p>
        <div className={styles.modalActions}>
          <button className={styles.btnReject} onClick={onClose}>
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
};

const AdherenteForm: React.FC = () => {
  const navigate = useNavigate();

  /* ——— Personal details ——— */
  const [title, setTitle] = useState("Sr.");
  const [firstName, setFirst] = useState("");
  const [lastName, setLast] = useState("");
  const [dob, setDob] = useState("");
  const [gender, setGender] = useState("male");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  const [addressLine, setAddressLine] = useState("");
  const [addressNotes, setAddressNotes] = useState("");

  /* ——— Professional details (replaces Order info) ——— */
  const [degree, setDegree] = useState("Médico/a");
  const [license, setLicense] = useState("");
  const [specialty, setSpecialty] = useState("");
  const [entryDate, setEntryDate] = useState("");
  const [workplace, setWorkplace] = useState("");
  const [category, setCategory] = useState("Adherente");
  const [notes, setNotes] = useState("");

  /* ——— Modals ——— */
  const [showSuccess, setShowSuccess] = useState(false);
  const [showReject, setShowReject] = useState(false);

  const canSubmit =
    firstName.trim() && lastName.trim() && email.trim() && license.trim();

  const handleSubmit = () => {
    if (!canSubmit) {
      setShowReject(true);
      return;
    }
    // here you would call your API; on success:
    setShowSuccess(true);
  };

  return (
    <div className={styles.wrap}>
      {/* Header */}
      <div className={styles.topBar}>
        <BackButton />
        <button className={styles.searchBtn} type="button">
          Buscar
        </button>
      </div>

      {/* Card */}
      <div className={styles.card}>
        {/* Logo block (centered like the screenshot) */}
        <div className={styles.logoBlock}>
          <div className={styles.logoMark} />
          <h1 className={styles.brand}>Colegio Médico de Corrientes</h1>
          <p className={styles.brandMeta}>
            Corrientes · +54 379 425 2323 
          </p>
        </div>

        {/* PERSONAL DETAILS */}
        <h2 className={styles.sectionTitle}>Personal details</h2>
        <div className={styles.hr} />

        <div className={styles.twoCol}>
          {/* Name row (title + first + last) */}
          <div className={styles.row}>
            <label className={styles.label}>Name</label>
            <div className={styles.nameRow}>
              <select
                className={styles.input}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              >
                <option>Sr.</option>
                <option>Sra.</option>
                <option>Dr.</option>
                <option>Dra.</option>
              </select>
              <input
                className={styles.input}
                placeholder="Nombre"
                value={firstName}
                onChange={(e) => setFirst(e.target.value)}
              />
              <input
                className={styles.input}
                placeholder="Apellido"
                value={lastName}
                onChange={(e) => setLast(e.target.value)}
              />
            </div>
          </div>

          <div className={styles.row}>
            <label className={styles.label}>Date of birth</label>
            <input
              className={styles.input}
              type="date"
              value={dob}
              onChange={(e) => setDob(e.target.value)}
              placeholder="dd/mm/yyyy"
            />
          </div>

          <div className={styles.row}>
            <label className={styles.label}>Address</label>
            <div className={styles.addressCluster}>
              <input
                className={styles.input}
                placeholder="Calle y número"
                value={addressLine}
                onChange={(e) => setAddressLine(e.target.value)}
              />
              <button
                type="button"
                className={styles.searchIcon}
                aria-label="Buscar dirección"
              >
                🔍
              </button>
            </div>
          </div>

          <div className={styles.row}>
            <label className={styles.label}>Gender</label>
            <select
              className={styles.input}
              value={gender}
              onChange={(e) => setGender(e.target.value)}
            >
              <option value="male">male</option>
              <option value="female">female</option>
              <option value="other">other</option>
            </select>
          </div>

          <div className={styles.row}>
            <label className={styles.label}>Address notes</label>
            <textarea
              className={styles.textarea}
              rows={3}
              placeholder="Departamento, referencias, etc."
              value={addressNotes}
              onChange={(e) => setAddressNotes(e.target.value)}
            />
          </div>

          <div className={styles.row}>
            <label className={styles.label}>Email</label>
            <input
              className={styles.input}
              type="email"
              placeholder="correo@dominio.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className={styles.row}>
            <label className={styles.label}>Telephone</label>
            <input
              className={styles.input}
              placeholder="Teléfono"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>
        </div>

        {/* PROFESSIONAL DETAILS (replaces "Order details") */}
        <div className={styles.sectionRow}>
          <h2 className={styles.sectionTitle}>Professional details</h2>
          <button
            type="button"
            className={styles.addLink}
            onClick={() => setNotes((n) => n)}
          >
            agregar + {/* placeholder action to mirror screenshot */}
          </button>
        </div>
        <div className={styles.hr} />

        <div className={styles.twoCol}>
          <div className={styles.row}>
            <label className={styles.label}>Degree / Title</label>
            <select
              className={styles.input}
              value={degree}
              onChange={(e) => setDegree(e.target.value)}
            >
              <option>Médico/a</option>
              <option>Odontólogo/a</option>
              <option>Bioquímico/a</option>
              <option>Lic. en Enfermería</option>
            </select>
          </div>

          <div className={styles.row}>
            <label className={styles.label}>Entry date</label>
            <input
              className={styles.input}
              type="date"
              value={entryDate}
              onChange={(e) => setEntryDate(e.target.value)}
              placeholder="dd/mm/yyyy"
            />
          </div>

          <div className={styles.row}>
            <label className={styles.label}>License number *</label>
            <input
              className={styles.input}
              placeholder="Matrícula"
              value={license}
              onChange={(e) => setLicense(e.target.value)}
            />
          </div>

          <div className={styles.row}>
            <label className={styles.label}>Workplace / Institution</label>
            <input
              className={styles.input}
              placeholder="Clínica / Hospital"
              value={workplace}
              onChange={(e) => setWorkplace(e.target.value)}
            />
          </div>

          <div className={styles.row}>
            <label className={styles.label}>Specialty</label>
            <input
              className={styles.input}
              placeholder="Especialidad"
              value={specialty}
              onChange={(e) => setSpecialty(e.target.value)}
            />
          </div>

          <div className={styles.row}>
            <label className={styles.label}>Category</label>
            <select
              className={styles.input}
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              <option>Adherente</option>
              <option>Activo</option>
              <option>Honorario</option>
            </select>
          </div>

          <div className={styles.row}>
            <label className={styles.label}>Notes</label>
            <textarea
              className={styles.textarea}
              rows={4}
              placeholder="Observaciones del registro"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </div>

        {/* Actions */}
        <div className={styles.actions}>
          <button
            className={styles.secondary}
            onClick={() => navigate("/register")}
            type="button"
          >
            Completar registro completo
          </button>
          <button
            className={styles.primary}
            type="button"
            onClick={handleSubmit}
            aria-disabled={!canSubmit}
          >
            Submit
          </button>
        </div>
      </div>

      {/* Modals */}
      <SuccessModal
        open={showSuccess}
        onClose={() => {
          setShowSuccess(false);
          navigate("/");
        }}
        name={`${firstName} ${lastName}`}
        title="¡Solicitud enviada!"
        message="Tu solicitud de Socio Adherente fue recibida correctamente."
      />

      <RejectModal
        open={showReject}
        onClose={() => setShowReject(false)}
        title="No pudimos enviar tu solicitud"
        message="Revisá los campos obligatorios: Nombre, Apellido, Email y Matrícula."
      />
    </div>
  );
};

export default AdherenteForm;
