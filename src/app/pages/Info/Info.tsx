"use client";
import React, { useState } from "react";
import styles from "./Info.module.scss";
import { Link, useNavigate } from "react-router-dom";

type Item = {
  id: string;
  text: React.ReactNode;
  hint?: string;
  tags?: (
    | "obligatorio"
    | "no-obligatorio"
    | "legalizado"
    | "simple"
    | "importante"
  )[];
};

const Tag: React.FC<{ kind: NonNullable<Item["tags"]>[number] }> = ({
  kind,
}) => {
  const label =
    kind === "obligatorio"
      ? "Obligatorio"
      : kind === "no-obligatorio"
      ? "No obligatorio"
      : kind === "legalizado"
      ? "Legalizado"
      : kind === "simple"
      ? "Copia simple"
      : "Importante";
  return (
    <span className={`${styles.tag} ${styles[`tag--${kind}`]}`}>{label}</span>
  );
};

const Bullet: React.FC<{ item: Item }> = ({ item }) => (
  <li className={styles.reqItem} key={item.id} aria-label="requisito">
    <div className={styles.reqMain}>
      <span className={styles.reqCheck} aria-hidden>
        •
      </span>
      <div className={styles.reqText}>
        <div className={styles.reqLine}>
          {item.text}
          {item.tags?.map((t) => (
            <Tag key={t} kind={t} />
          ))}
        </div>
        {item.hint && <p className={styles.reqHint}>{item.hint}</p>}
      </div>
    </div>
  </li>
);

const Section: React.FC<{
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}> = ({ title, children, defaultOpen = true }) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section className={`${styles.card} ${styles.section}`}>
      <button
        className={styles.sectionHeader}
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <span className={styles.sectionDot} />
        <h3>{title}</h3>
        <span className={styles.spacer} />
        <span className={styles.chev} aria-hidden>
          {open ? "▾" : "▸"}
        </span>
      </button>
      {open && <div className={styles.sectionBody}>{children}</div>}
    </section>
  );
};

const Info: React.FC = () => {
  const principales: Item[] = [
    {
      id: "1",
      text: (
        <>
          Fotocopia del <strong>Título de Médico</strong> (ambos lados) con
          inscripción de matrículas e inscripción en los Ministerios de
          Educación de la Nación y del Interior.
        </>
      ),
      tags: ["legalizado"],
      hint: "Legalizado por Escribano Público.",
    },
    {
      id: "2",
      text: (
        <>
          Fotocopia del <strong>Título de Especialista</strong> y{" "}
          <strong>Resolución Ministerial</strong> de la especialidad (o Título
          de Residencia/Concurrencia/Servicio donde realizó la capacitación).
        </>
      ),
      tags: ["legalizado"],
      hint: "Legalizado por Escribano Público. Emitido por Ministerio de Salud Pública de la Pcia. de Corrientes.",
    },
  ];

  const copiasSimples: Item[] = [
    {
      id: "3a",
      text: <>Matrícula Provincial (ambos lados).</>,
      tags: ["no-obligatorio", "simple"],
    },
    {
      id: "3b",
      text: <>Matrícula Nacional (ambos lados).</>,
      tags: ["no-obligatorio", "simple"],
    },
    {
      id: "3c",
      text: (
        <>
          DNI con domicilio actualizado <em>o</em> Constancia Policial de
          Domicilio.
        </>
      ),
      tags: ["obligatorio", "simple"],
    },
    {
      id: "3d",
      text: (
        <>
          Inscripción en AFIP (CUIT) indicando condición fiscal (
          <strong>Monotributista</strong> o{" "}
          <strong>Responsable Inscripto</strong>) y{" "}
          <strong>último recibo de pago</strong>.
        </>
      ),
      tags: ["obligatorio", "simple"],
    },
    {
      id: "3e",
      text: <>Inscripción y Exención en DGR.</>,
      tags: ["obligatorio", "simple"],
    },
    {
      id: "3f",
      text: (
        <>
          Trámite de inscripción en la{" "}
          <strong>Superintendencia de Servicios de Salud</strong> (comprobante).{" "}
        </>
      ),
      hint: "Presenta un comprobante con plazo de 60 días para el Resuelto. ANSSAL – Ctes. 25 de Mayo Nº 1425 – Tel. 4430148.",
      tags: ["obligatorio", "simple"],
    },
    {
      id: "3g",
      text: (
        <>
          Póliza y último recibo de pago del{" "}
          <strong>Seguro de Mala Praxis</strong> (si no lo gestiona el Colegio
          Médico).
        </>
      ),
      tags: ["obligatorio", "simple"],
    },
    {
      id: "3h",
      text: (
        <>
          <strong>Habilitación Ministerial del consultorio</strong> o nota del
          director médico del instituto que certifique que integra el plantel y
          que la institución está habilitada por el MSP.
        </>
      ),
      tags: ["obligatorio", "simple"],
    },
    {
      id: "3i",
      text: (
        <>
          <strong>Declaración de aparatología</strong> (si realiza prácticas con
          equipamiento facturable): certificado de compra y características.
        </>
      ),
      tags: ["obligatorio", "simple"],
    },
    {
      id: "3j",
      text: (
        <>
          Si estuvo asociado a otro Colegio/Federación:{" "}
          <strong>Certificado de antecedentes Ético-Gremiales</strong> y{" "}
          <strong>Libre Deuda</strong>; caso contrario,{" "}
          <strong>Acta de Declaración</strong> aclarando situación.
        </>
      ),
      tags: ["obligatorio", "simple"],
    },
    {
      id: "3k",
      text: (
        <>
          <strong>Nota</strong> dirigida al Presidente del Colegio Médico de
          Corrientes (Pedro A. Espinoza) solicitando su aceptación como
          socio-prestador.
        </>
      ),
      tags: ["obligatorio", "simple"],
    },
    {
      id: "3l",
      text: (
        <>
          <strong>Aclaración del punto 12</strong>: no presenta certificado de
          antecedentes Ético-Gremiales por motivos fundados.
        </>
      ),
      tags: ["importante", "simple"],
    },
    {
      id: "3m",
      text: <>Dos fotos tipo carnet.</>,
      tags: ["obligatorio", "simple"],
    },
    {
      id: "3n",
      text: (
        <>
          Completar la <strong>ficha de inscripción</strong> provista por la
          Institución.
        </>
      ),
      tags: ["obligatorio", "simple"],
    },
  ];

  const navigate = useNavigate();

  const handleBack = () => {
    if (window.history.length > 1) navigate(-1);
    else navigate("/"); // fallback if no history
  };

  return (
    <div className={styles.page}>
      <header className={styles.hero}>
        <button
          type="button"
          className={styles.backButton}
          onClick={handleBack}
          aria-label="Volver atrás"
        >
          <svg
            className={styles.backIcon}
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              d="M14 7l-5 5 5 5M19 12H9"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <span className={styles.backLabel}>Volver</span>
        </button>
        <div className={styles.heroContent}>
          <h1>Requisitos de Ingreso — Socio Prestador</h1>
          <p>
            Presentá la documentación para incorporarte como prestador del{" "}
            <strong>Colegio Médico de Corrientes</strong>. Organizamos todo en
            pasos claros y etiquetas para que sepas qué es legalizado y qué es
            copia simple.
          </p>
          <div className={styles.heroActions}>
            <a
              className={styles.btnPrimary}
              href="mailto:secretariacolegiomedicoctes@gmail.com?subject=Consulta%20Socio%20Prestador"
            >
              Consultar por email
            </a>
            <a
              className={styles.btnGhost}
              href="tel:+543794722121"
              aria-label="Llamar al número de contacto"
            >
              Llamar: 3794-722121
            </a>
          </div>
        </div>
      </header>

      <main className={styles.content}>
        <aside className={styles.card}>
          <h2 className={styles.cardTitle}>Contacto & Sede</h2>
          <div className={styles.contactGrid}>
            <div>
              <p className={styles.kv}>
                <span>Dirección</span>
                <strong>Carlos Pellegrini 1785</strong>
              </p>
              <p className={styles.kv}>
                <span>Teléfono</span>
                <a href="tel:+543794722121">3794-722121</a>
              </p>
              <p className={styles.kv}>
                <span>Email</span>
                <a href="mailto:secretariacolegiomedicoctes@gmail.com">
                  secretariacolegiomedicoctes@gmail.com
                </a>
              </p>
            </div>
            <div className={styles.badges}>
              <span className={`${styles.lozenge} ${styles.lozengeBlue}`}>
                Atención administrativa
              </span>
              <span className={`${styles.lozenge} ${styles.lozengeGray}`}>
                Llevá originales y copias
              </span>
            </div>
          </div>
        </aside>

        <Section title="Documentación principal">
          <ul className={styles.reqList}>
            {principales.map((i) => (
              <Bullet key={i.id} item={i} />
            ))}
          </ul>
        </Section>

        <Section title="Copias simples y otras constancias">
          <ul className={styles.reqList}>
            {copiasSimples.map((i) => (
              <Bullet key={i.id} item={i} />
            ))}
          </ul>
        </Section>

        <section className={`${styles.card} ${styles.fees}`}>
          <h3>Aranceles</h3>
          <div className={styles.feeRow}>
            <span>Costo de inscripción</span>
            <strong>$ 40.000</strong>
          </div>
          <div className={styles.feeRow}>
            <span>Cuota societaria</span>
            <strong>$ 8.000</strong>
          </div>
          <p className={styles.feeNote}>
            Los montos pueden actualizarse. Confirmá valores vigentes al momento
            de presentar la documentación.
          </p>
        </section>
      </main>
    </div>
  );
};

export default Info;
