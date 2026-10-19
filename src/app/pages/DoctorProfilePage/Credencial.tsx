import type React from "react";
import { useMemo } from "react";
import { BadgeCheck, Download, ShieldCheck } from "lucide-react";

// Escudo recortado y con fondo transparente.
import escudo from "../../assets/escudoCMC.png";
import styles from "./Credencial.module.scss";

interface Props {
  /** NOMBRE del padrón, o apellido + nombre si vienen separados. */
  nombre: string;
  /** Sexo del legajo: define si dice "Dr." o "Dra.". */
  sexo?: string | null;
  documento?: string | number | null;
  /** Primera especialidad adherida. Sin especialidad la línea no se muestra. */
  especialidad?: string | null;
  /** `EXISTE === 'S'` en el legajo. */
  activo: boolean;
  /** `false` para el personal del Colegio (INGRESAR distinto de 'D'). */
  esMedico?: boolean;
}

/** 12867493 → "12.867.493". Vacío si no hay documento cargado. */
function formatearDocumento(doc?: string | number | null): string {
  if (doc == null || doc === "") return "—";
  const soloDigitos = String(doc).replace(/\D/g, "");
  if (!soloDigitos) return "—";
  return Number(soloDigitos).toLocaleString("es-AR");
}

/** Credencial profesional del socio. */
const Credencial: React.FC<Props> = ({
  nombre,
  sexo,
  documento,
  especialidad,
  activo,
  esMedico = true,
}) => {
  // Mismo criterio que el PDF legacy: 'F' → Dra., cualquier otra cosa → Dr. El personal del Colegio también tiene legajo.
  const titulo = !esMedico
    ? ""
    : String(sexo ?? "").trim().toUpperCase() === "F"
      ? "Dra."
      : "Dr.";

  const emitida = useMemo(
    () =>
      new Date().toLocaleDateString("es-AR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      }),
    []
  );

  return (
    <div className={styles.wrap}>
      <article className={styles.card}>
        <div className={styles.top}>
          <span className={styles.marca}>
            <svg
              className={styles.asterisco}
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              aria-hidden="true"
            >
              <path d="M12 3.5v17M4.6 7.75l14.8 8.5M19.4 7.75l-14.8 8.5" />
            </svg>
            Colegio Médico de Corrientes
          </span>
          <span className={styles.etiqueta}>Credencial</span>
        </div>

        <img className={styles.escudo} src={escudo} alt="" aria-hidden="true" />

        <h3 className={styles.nombre}>
          {titulo ? `${titulo} ${nombre}` : nombre}
        </h3>

        {esMedico
          ? especialidad && <p className={styles.especialidad}>{especialidad}</p>
          : (
            <p className={styles.personal}>
              <BadgeCheck size={14} strokeWidth={2.4} aria-hidden="true" />
              Personal de Colegio Médico
            </p>
          )}

        <div className={styles.pie}>
          <div className={styles.dato}>
            <span className={styles.datoLabel}>DNI</span>
            <span className={styles.datoValor}>{formatearDocumento(documento)}</span>
            <span
              className={`${styles.estado} ${activo ? "" : styles.estadoInactivo}`}
            >
              {activo ? "Activo" : "Inactivo"}
            </span>
          </div>
          <span className={styles.fecha}>{emitida}</span>
        </div>
      </article>

      <button type="button" className={styles.boton} onClick={() => window.print()}>
        <Download size={17} />
        Descargar credencial
      </button>

      <p className={styles.leyenda}>
        <ShieldCheck size={15} />
        Documento válido como credencial {esMedico ? "profesional" : "del personal"} del
        Colegio Médico de Corrientes. Emitida el {emitida}.
      </p>
    </div>
  );
};

export default Credencial;
