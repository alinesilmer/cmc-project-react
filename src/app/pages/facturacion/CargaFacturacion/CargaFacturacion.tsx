import { useCallback, useMemo, useState } from "react";
import styles from "./CargaFacturacion.module.scss";

type TipoPrestacion = "CONSULTA" | "PRACTICA" | "OTRO";

type FormState = {
  obraSocial: string;
  doctor: string;
  tipo: TipoPrestacion;
  codigoPrestacion: string;
  honorarios: string;
  gastos: string;
  coseguro: string;
  validacion: string;
  nroAfiliado: string;
  nombreAfiliado: string;
  sesion: string;
  cantidad: string;
  fechaPrestacion: string;
};

type RequestPayload = {
  obraSocial: string;
  doctor: string;
  tipo: TipoPrestacion;
  codigoPrestacion: string;
  honorarios: number;
  gastos: number;
  coseguro: number;
  valorPrestacion: number;
  validacion: string;
  nroAfiliado: string;
  nombreAfiliado: string;
  sesion: number;
  cantidad: number;
  fechaPrestacion: string;
};

const INITIAL_FORM: FormState = {
  obraSocial: "",
  doctor: "",
  tipo: "CONSULTA",
  codigoPrestacion: "",
  honorarios: "",
  gastos: "",
  coseguro: "",
  validacion: "",
  nroAfiliado: "",
  nombreAfiliado: "",
  sesion: "1",
  cantidad: "1",
  fechaPrestacion: "",
};

const DECIMAL_FIELDS = new Set<keyof FormState>([
  "honorarios",
  "gastos",
  "coseguro",
]);

const INTEGER_FIELDS = new Set<keyof FormState>(["sesion", "cantidad"]);

const MAX_LENGTH_BY_FIELD: Partial<Record<keyof FormState, number>> = {
  obraSocial: 20,
  doctor: 30,
  codigoPrestacion: 30,
  validacion: 40,
  nroAfiliado: 40,
  nombreAfiliado: 120,
  sesion: 3,
  cantidad: 3,
};

const sanitizeDecimal = (value: string) => {
  const cleaned = value.replace(/[^\d.,-]/g, "");
  const parts = cleaned.replace(",", ".").split(".");

  if (parts.length <= 1) {
    return cleaned.replace(",", ".");
  }

  return `${parts[0]}.${parts.slice(1).join("")}`;
};

const sanitizeInteger = (value: string) => value.replace(/\D/g, "");

const toSafeNumber = (value: string) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const formatCurrency = (value: number) =>
  value.toLocaleString("es-AR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const buildRequestPayload = (
  form: FormState,
  valorPrestacion: number
): RequestPayload => ({
  obraSocial: form.obraSocial.trim(),
  doctor: form.doctor.trim(),
  tipo: form.tipo,
  codigoPrestacion: form.codigoPrestacion.trim(),
  honorarios: toSafeNumber(form.honorarios),
  gastos: toSafeNumber(form.gastos),
  coseguro: toSafeNumber(form.coseguro),
  valorPrestacion,
  validacion: form.validacion.trim(),
  nroAfiliado: form.nroAfiliado.trim(),
  nombreAfiliado: form.nombreAfiliado.trim(),
  sesion: Math.max(toSafeNumber(form.sesion), 1),
  cantidad: Math.max(toSafeNumber(form.cantidad), 1),
  fechaPrestacion: form.fechaPrestacion,
});

const submitPayload = async (_payload: RequestPayload) => {
  // TODO backend: reemplazar por POST real (HTTPS + auth + validación server-side).
};

const CargaFacturacion = () => {
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      const { name, value } = event.target;
      const fieldName = name as keyof FormState;

      let nextValue = value;

      if (DECIMAL_FIELDS.has(fieldName)) {
        nextValue = sanitizeDecimal(value);
      }

      if (INTEGER_FIELDS.has(fieldName)) {
        nextValue = sanitizeInteger(value);
      }

      const maxLength = MAX_LENGTH_BY_FIELD[fieldName];

      if (typeof maxLength === "number") {
        nextValue = nextValue.slice(0, maxLength);
      }

      setForm((prev) => ({
        ...prev,
        [fieldName]: nextValue,
      }));
    },
    []
  );

  const valorPrestacion = useMemo(() => {
    const honorarios = toSafeNumber(form.honorarios);
    const gastos = toSafeNumber(form.gastos);
    const coseguro = toSafeNumber(form.coseguro);
    const cantidad = Math.max(toSafeNumber(form.cantidad), 1);

    // Regla inicial: total = (honorarios + gastos - coseguro) * cantidad.
    // TODO backend: ajustar si la lógica de negocio real usa otra fórmula.
    const total = (honorarios + gastos - coseguro) * cantidad;

    return total > 0 ? total : 0;
  }, [form.honorarios, form.gastos, form.coseguro, form.cantidad]);

  const handleSubmit = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();

      if (isSubmitting) {
        return;
      }

      const payload = buildRequestPayload(form, valorPrestacion);

      try {
        setIsSubmitting(true);

        // Seguridad: el frontend ayuda, pero el backend debe volver a validar todo.
        await submitPayload(payload);
      } finally {
        setIsSubmitting(false);
      }
    },
    [form, isSubmitting, valorPrestacion]
  );

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Carga de Facturación</h1>
        <p className={styles.subtitle}>
          Completá los datos de la prestación y del afiliado para registrar la
          carga.
        </p>
      </div>

      <form className={styles.formCard} onSubmit={handleSubmit} noValidate>
        <section className={styles.formSection}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>Datos de la prestación</h2>
          </div>

          <div className={styles.fieldGrid}>
            <div className={styles.formGroup}>
              <label className={styles.label} htmlFor="obraSocial">
                Obra social
              </label>
              <input
                id="obraSocial"
                name="obraSocial"
                className={styles.input}
                value={form.obraSocial}
                onChange={handleChange}
                placeholder="Código o identificador"
                inputMode="text"
                autoComplete="off"
                required
              />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label} htmlFor="doctor">
                Doctor/a
              </label>
              <input
                id="doctor"
                name="doctor"
                className={styles.input}
                value={form.doctor}
                onChange={handleChange}
                placeholder="Matrícula o socio"
                inputMode="text"
                autoComplete="off"
                required
              />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label} htmlFor="tipo">
                Tipo
              </label>
              <select
                id="tipo"
                name="tipo"
                className={styles.select}
                value={form.tipo}
                onChange={handleChange}
              >
                <option value="CONSULTA">CONSULTA</option>
                <option value="PRACTICA">PRÁCTICA</option>
                <option value="HONORARIO">HONORARIO</option>
                  <option value="SANATORIO">SANATORIO</option>
              </select>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label} htmlFor="codigoPrestacion">
                Código prestación
              </label>
              <input
                id="codigoPrestacion"
                name="codigoPrestacion"
                className={styles.input}
                value={form.codigoPrestacion}
                onChange={handleChange}
                placeholder="Código"
                inputMode="text"
                autoComplete="off"
                required
              />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label} htmlFor="honorarios">
                Honorarios
              </label>
              <input
                id="honorarios"
                name="honorarios"
                className={styles.input}
                value={form.honorarios}
                onChange={handleChange}
                placeholder="0,00"
                inputMode="decimal"
                autoComplete="off"
              />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label} htmlFor="gastos">
                Gastos
              </label>
              <input
                id="gastos"
                name="gastos"
                className={styles.input}
                value={form.gastos}
                onChange={handleChange}
                placeholder="0,00"
                inputMode="decimal"
                autoComplete="off"
              />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label} htmlFor="coseguro">
                Coseguro
              </label>
              <input
                id="coseguro"
                name="coseguro"
                className={styles.input}
                value={form.coseguro}
                onChange={handleChange}
                placeholder="0,00"
                inputMode="decimal"
                autoComplete="off"
              />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>Valor prestación</label>
              <div className={styles.valueBox}>${formatCurrency(valorPrestacion)}</div>
            </div>
          </div>
        </section>

        <div className={styles.separator} />

        <section className={styles.formSection}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>Datos del afiliado</h2>
            <p className={styles.sectionDescription}>
              Completá los datos necesarios para asociar correctamente la
              prestación al afiliado.
            </p>
          </div>

          <div className={styles.fieldGrid}>
            <div className={styles.formGroup}>
              <label className={styles.label} htmlFor="validacion">
                Validación
              </label>
              <input
                id="validacion"
                name="validacion"
                className={styles.input}
                value={form.validacion}
                onChange={handleChange}
                placeholder="Código / token / referencia"
                inputMode="text"
                autoComplete="off"
              />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label} htmlFor="nroAfiliado">
                Nro. de afiliado
              </label>
              <input
                id="nroAfiliado"
                name="nroAfiliado"
                className={styles.input}
                value={form.nroAfiliado}
                onChange={handleChange}
                placeholder="Número de afiliado"
                inputMode="text"
                autoComplete="off"
                required
              />
            </div>

            <div className={styles.formGroupFull}>
              <label className={styles.label} htmlFor="nombreAfiliado">
                Nombre afiliado
              </label>
              <input
                id="nombreAfiliado"
                name="nombreAfiliado"
                className={styles.input}
                value={form.nombreAfiliado}
                onChange={handleChange}
                placeholder="Nombre y apellido"
                inputMode="text"
                autoComplete="name"
                required
              />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label} htmlFor="sesion">
                Sesión
              </label>
              <input
                id="sesion"
                name="sesion"
                className={styles.input}
                value={form.sesion}
                onChange={handleChange}
                placeholder="1"
                inputMode="numeric"
                autoComplete="off"
              />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label} htmlFor="cantidad">
                Cantidad
              </label>
              <input
                id="cantidad"
                name="cantidad"
                className={styles.input}
                value={form.cantidad}
                onChange={handleChange}
                placeholder="1"
                inputMode="numeric"
                autoComplete="off"
              />
            </div>

            <div className={styles.formGroupFull}>
              <label className={styles.label} htmlFor="fechaPrestacion">
                Fecha prestación
              </label>
              <input
                id="fechaPrestacion"
                name="fechaPrestacion"
                type="date"
                className={styles.input}
                value={form.fechaPrestacion}
                onChange={handleChange}
                required
              />
            </div>
          </div>
        </section>

        <div className={styles.actions}>
          <button
            type="submit"
            className={styles.submitButton}
            disabled={isSubmitting}
          >
            {isSubmitting ? "Procesando..." : "Cargar prestaciones"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CargaFacturacion;