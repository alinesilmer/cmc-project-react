"use client";

import React, { useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import Sidebar from "../../molecules/Sidebar/Sidebar";
import Card from "../../atoms/Card/Card";
import Button from "../../atoms/Button/Button";
import Input from "../../atoms/Input/Input";
import styles from "./EditDoctorForm.module.scss";

type Doc = {
  id: string;
  label: string;
  fileName: string;
  file?: File;
  url?: string;
};

export default function EditDoctorPage() {
  const { id } = useParams();

  // ----- FAKE seeded data (localhost) -----
  const [memberNumber, setMemberNumber] = useState("001");
  const [name, setName] = useState("Pedro");
  const [surname, setSurname] = useState("Espinoza");
  const [email, setEmail] = useState("hello@pedroespinoza.com");
  const [phone, setPhone] = useState("+54 379 433-3333");
  const [address, setAddress] = useState("17 de Agosto, Corrientes Capital");
  const [specialty, setSpecialty] = useState("Médico Cirujano");
  const [provincialReg, setProvincialReg] = useState("MP001");
  const [nationalReg, setNationalReg] = useState("MN001");

  const [docs, setDocs] = useState<Doc[]>([
    {
      id: "a1",
      label: "DNI",
      fileName: "dni_pedro_espinoza.pdf",
      url: "/api/docs/1",
    },
    {
      id: "a2",
      label: "Título",
      fileName: "titulo_pedro_espinoza.pdf",
      url: "/api/docs/2",
    },
  ]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const onDrop = (files: FileList) => {
    const next: Doc[] = [];
    Array.from(files).forEach((f) =>
      next.push({
        id: crypto.randomUUID(),
        label: "Documento",
        fileName: f.name,
        file: f,
      })
    );
    setDocs((prev) => [...prev, ...next]);
  };
  const removeDoc = (docId: string) =>
    setDocs((prev) => prev.filter((d) => d.id !== docId));

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      id,
      memberNumber,
      name,
      surname,
      email,
      phone,
      address,
      specialty,
      provincialReg,
      nationalReg,
      documents: docs.map(({ id, label, fileName }) => ({
        id,
        label,
        fileName,
      })),
    };
    console.log("EDIT DOCTOR (fake submit)", payload);
    alert("Guardado (fake). Reemplazar con llamada real a la API.");
    /* REAL ENDPOINT GUIDE:
      PUT /doctors/:id
      Body: { memberNumber, name, surname, email, phone, address, specialty, provincialReg, nationalReg }
      Response: updated doctor
      await apiUpdateDoctor(id!, {...})
    */
  };

  return (
    <div className={styles.page}>
      <Sidebar />
      <div className={styles.content}>
        <div className={styles.topbar}>
          <Link to={`/doctors/${id}`} className={styles.backLink}>
            ← Volver al perfil
          </Link>
          <div />
        </div>

        <Card className={styles.card}>
          <h1 className={styles.title}>Editar médico</h1>

          <form className={styles.form} onSubmit={onSubmit}>
            <div className={styles.grid}>
              <div className={styles.field}>
                <label>Nombre</label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Nombre"
                />
              </div>
              <div className={styles.field}>
                <label>Apellido</label>
                <Input
                  value={surname}
                  onChange={(e) => setSurname(e.target.value)}
                  placeholder="Apellido"
                />
              </div>
              <div className={styles.field}>
                <label>Especialidad</label>
                <Input
                  value={specialty}
                  onChange={(e) => setSpecialty(e.target.value)}
                  placeholder="Especialidad"
                />
              </div>
              <div className={styles.field}>
                <label>N° Socio</label>
                <Input
                  value={memberNumber}
                  onChange={(e) => setMemberNumber(e.target.value)}
                  placeholder="N° socio"
                />
              </div>
              <div className={styles.field}>
                <label>Matrícula Provincial</label>
                <Input
                  value={provincialReg}
                  onChange={(e) => setProvincialReg(e.target.value)}
                  placeholder="MP"
                />
              </div>
              <div className={styles.field}>
                <label>Matrícula Nacional</label>
                <Input
                  value={nationalReg}
                  onChange={(e) => setNationalReg(e.target.value)}
                  placeholder="MN"
                />
              </div>
              <div className={styles.field}>
                <label>Email</label>
                <Input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="correo@ejemplo.com"
                />
              </div>
              <div className={styles.field}>
                <label>Teléfono</label>
                <Input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+54 9 ..."
                />
              </div>
              <div className={styles.colSpan2}>
                <label>Dirección</label>
                <Input
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Dirección"
                />
              </div>
            </div>

            {/* DOCUMENTS */}
            <h3 className={styles.section}>Documentación</h3>
            <div
              className={styles.dropzone}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                if (e.dataTransfer.files?.length) onDrop(e.dataTransfer.files);
              }}
            >
              <p className={styles.dropTitle}>Arrastrá archivos o</p>
              <Button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                variant="secondary"
              >
                Buscar archivos
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                className={styles.hidden}
                onChange={(e) => e.target.files && onDrop(e.target.files)}
              />
              <p className={styles.dropHint}>
                txt, docx, pdf, jpeg, xlsx — hasta 50MB
              </p>
            </div>

            {docs.length ? (
              <ul className={styles.docList}>
                {docs.map((d) => (
                  <li key={d.id} className={styles.docRow}>
                    <div>
                      <div className={styles.docLabel}>{d.label}</div>
                      <div className={styles.docName}>{d.fileName}</div>
                    </div>
                    <button
                      type="button"
                      className={styles.iconButton}
                      onClick={() => removeDoc(d.id)}
                      title="Eliminar"
                    >
                      ✕
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className={styles.muted}>No hay documentos cargados.</p>
            )}
            {/* REAL ENDPOINT GUIDE:
              POST /doctors/:id/documents  (multipart/form-data)
              DELETE /doctors/:id/documents/:docId
            */}

            <div className={styles.actions}>
              <Button type="submit" variant="primary">
                Guardar cambios
              </Button>
              <Link to={`/doctors/${id}`} className={styles.cancelLink}>
                Cancelar
              </Link>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
}
