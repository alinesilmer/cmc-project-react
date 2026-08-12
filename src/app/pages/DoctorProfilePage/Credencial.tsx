import type React from "react";
import { useMemo } from "react";
import { Download, ShieldCheck } from "lucide-react";

// Escudo recortado y con fondo transparente. `logoCMC.png` NO sirve acá: viene
// sobre fondo negro, y sobre el azul de la tarjeta se vería un cuadrado negro.
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
}

/** 12867493 → "12.867.493". Vacío si no hay documento cargado. */
function formatearDocumento(doc?: string | number | null): string {
  if (doc == null || doc === "") return "—";
  const soloDigitos = String(doc).replace(/\D/g, "");
  if (!soloDigitos) return "—";
  return Number(soloDigitos).toLocaleString("es-AR");
}

/**
 * Credencial profesional del socio.
 *
 * Es la misma tarjeta que muestra la app móvil, para que el médico vea lo mismo
 * en los dos lados. En el sistema viejo esto era un PDF que se descargaba
 * (`credencial_pdf.php`, FPDF); acá se muestra en pantalla y el botón abre el
 * diálogo de impresión, que en Chrome permite guardarla como PDF.
 *
 * No inventa datos: todo sale del legajo. Si falta el documento o la
 * especialidad, se muestra el guion o se omite la línea.
 */
const Credencial: React.FC<Props> = ({
  nombre,
  sexo,
  documento,
  especialidad,
  activo,
}) => {
  // Mismo criterio que el PDF legacy: 'F' → Dra., cualquier otra cosa → Dr.
  const titulo = String(sexo ?? "").trim().toUpperCase() === "F" ? "Dra." : "Dr.";

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
          {titulo} {nombre}
        </h3>

        {especialidad && <p className={styles.especialidad}>{especialidad}</p>}

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
        Documento válido como credencial profesional del Colegio Médico de
        Corrientes. Emitida el {emitida}.
      </p>
    </div>
  );
};

export default Credencial;
