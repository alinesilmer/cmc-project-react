import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Filter,
  FileText,
  Upload,
  Save,
  AlertTriangle,
  Lock,
  Search,
} from "lucide-react";
import styles from "./CierrePeriodoFacturista.module.scss";

type PeriodStatus = "ABIERTO" | "CERRADO";

type SocialWorkOption = {
  code: string;
  name: string;
  cuit: string;
  tipoFactura: string;
};

type PeriodInfo = {
  id: string;
  obraSocialCodigo: string;
  obraSocialNombre: string;
  periodo: string;
  estado: PeriodStatus;
  tipoFactura: string;
  cuit: string;
  fechaApertura: string;
  totalAcumulado: number;
  nroFacturaDesde: string;
  nroFacturaHasta: string;
};

const MAX_PDF_SIZE_BYTES = 10 * 1024 * 1024;

const sanitizeInteger = (value: string) => value.replace(/\D/g, "").slice(0, 12);

const formatCurrency = (value: number) =>
  value.toLocaleString("es-AR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const formatDisplayDate = (isoDate: string) => {
  if (!isoDate) return "—";

  const date = new Date(`${isoDate}T00:00:00`);
  if (Number.isNaN(date.getTime())) return isoDate;

  return date.toLocaleDateString("es-AR");
};

/**
 * TODO backend:
 * Reemplazar por endpoint real.
 *
 * Recomendado por performance:
 * exponer un endpoint único que reemplace el viejo:
 * SELECT * FROM obras_sociales ORDER BY OBRA_SOCIAL ASC
 *
 * Debe devolver:
 * - NRO_OBRASOCIAL
 * - OBRA_SOCIAL
 * - CUIT
 * - TIPO_FACT
 */
const fetchSocialWorks = async (
  signal?: AbortSignal
): Promise<SocialWorkOption[]> => {
  // Ejemplo sugerido:
  // const res = await fetch("/api/facturacion/obras-sociales", { signal, credentials: "include" });
  // if (!res.ok) throw new Error("No se pudo cargar la lista de obras sociales");
  // return res.json();

  await new Promise((resolve) => setTimeout(resolve, 250));

  if (signal?.aborted) {
    throw new DOMException("Aborted", "AbortError");
  }

  return [
    {
      code: "151",
      name: "OSDEL PODER JUDICIAL",
      cuit: "30636196858",
      tipoFactura: "B",
    },
    {
      code: "137",
      name: "ASOCIACION MUTUAL SANCOR",
      cuit: "30712345678",
      tipoFactura: "B",
    },
    {
      code: "304",
      name: "IOSCOR",
      cuit: "30999888777",
      tipoFactura: "B",
    },
    {
      code: "411",
      name: "OMINT",
      cuit: "30555111222",
      tipoFactura: "A",
    },
  ];
};

/**
 * TODO backend:
 * Reemplazar por endpoint real que traiga el período abierto de la obra social.
 *
 * Ideal por performance y simplicidad:
 * combinar en un solo endpoint lo que en legacy hoy sale de:
 * - periodos WHERE CERRADO='A' AND NRO_OBRA_SOCIAL=...
 * - obras_sociales WHERE NRO_OBRASOCIAL=...
 *
 * Debe validar permisos y devolver null si no hay período abierto.
 */
const fetchOpenPeriodBySocialWork = async (
  socialWorkCode: string,
  socialWorks: SocialWorkOption[],
  signal?: AbortSignal
): Promise<PeriodInfo | null> => {
  await new Promise((resolve) => setTimeout(resolve, 350));

  if (signal?.aborted) {
    throw new DOMException("Aborted", "AbortError");
  }

  const selected = socialWorks.find((item) => item.code === socialWorkCode);

  if (!selected) {
    return null;
  }

  return {
    id: `periodo-${socialWorkCode}`,
    obraSocialCodigo: selected.code,
    obraSocialNombre: selected.name,
    periodo: "2 - 2026",
    estado: "ABIERTO",
    tipoFactura: selected.tipoFactura,
    cuit: selected.cuit,
    fechaApertura: "2026-02-06",
    totalAcumulado: 42059901.66,
    nroFacturaDesde: "0",
    nroFacturaHasta: "0",
  };
};

/**
 * TODO backend:
 * POST real para guardar rango de factura.
 * Debe revalidar:
 * - que el período siga abierto
 * - que el usuario tenga permisos
 * - que el rango sea válido
 * - que no exista colisión de numeración
 */
const saveInvoiceRangeRequest = async (_payload: {
  periodId: string;
  socialWorkCode: string;
  invoiceFrom: string;
  invoiceTo: string;
}) => {
  await new Promise((resolve) => setTimeout(resolve, 400));
};

/**
 * TODO backend:
 * Subir PDF usando FormData + HTTPS.
 * Validar del lado servidor:
 * - autenticación
 * - MIME real
 * - tamaño
 * - asociación correcta al período
 */
const uploadInvoicePdfRequest = async (_payload: {
  periodId: string;
  socialWorkCode: string;
  file: File;
}) => {
  await new Promise((resolve) => setTimeout(resolve, 500));
};

/**
 * TODO backend:
 * Acción crítica.
 * Debe cerrar el período sólo si:
 * - sigue abierto
 * - el usuario tiene permisos
 * - el estado del proceso permite el cierre
 */
const closePeriodRequest = async (_payload: {
  periodId: string;
  socialWorkCode: string;
}) => {
  await new Promise((resolve) => setTimeout(resolve, 500));
};

const CierrePeriodoFacturista = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [socialWorks, setSocialWorks] = useState<SocialWorkOption[]>([]);
  const [isLoadingSocialWorks, setIsLoadingSocialWorks] = useState(true);

  const [socialWorkInput, setSocialWorkInput] = useState("");
  const [periodInfo, setPeriodInfo] = useState<PeriodInfo | null>(null);

  const [invoiceFrom, setInvoiceFrom] = useState("");
  const [invoiceTo, setInvoiceTo] = useState("");

  const [selectedPdf, setSelectedPdf] = useState<File | null>(null);
  const [fileError, setFileError] = useState("");
  const [filterError, setFilterError] = useState("");

  const [isFiltering, setIsFiltering] = useState(false);
  const [isSavingInvoice, setIsSavingInvoice] = useState(false);
  const [isUploadingPdf, setIsUploadingPdf] = useState(false);
  const [isClosingPeriod, setIsClosingPeriod] = useState(false);

  useEffect(() => {
    const controller = new AbortController();

    const loadSocialWorks = async () => {
      try {
        setIsLoadingSocialWorks(true);

        const data = await fetchSocialWorks(controller.signal);
        setSocialWorks(data);

        // UX: si hay datos, precargar el primer código para que el usuario parta de algo.
        if (data.length > 0) {
          setSocialWorkInput(data[0].code);
        }
      } catch (error) {
        if ((error as Error).name !== "AbortError") {
          setSocialWorks([]);
        }
      } finally {
        setIsLoadingSocialWorks(false);
      }
    };

    void loadSocialWorks();

    return () => controller.abort();
  }, []);

  const matchedSocialWork = useMemo(() => {
    const normalized = socialWorkInput.trim();
    return socialWorks.find((item) => item.code === normalized) ?? null;
  }, [socialWorks, socialWorkInput]);

  const isLocked = periodInfo?.estado === "CERRADO";

  const invoiceRangeValid = useMemo(() => {
    const from = Number(invoiceFrom);
    const to = Number(invoiceTo);

    if (!Number.isFinite(from) || !Number.isFinite(to)) return false;
    if (from <= 0 || to <= 0) return false;

    return from <= to;
  }, [invoiceFrom, invoiceTo]);

  const handleBack = useCallback(() => {
    navigate(-1);
  }, [navigate]);

  const handleFilter = useCallback(async () => {
    const code = socialWorkInput.trim();

    if (!code || isFiltering) {
      return;
    }

    if (!matchedSocialWork) {
      setFilterError("Seleccioná una obra social válida desde la lista.");
      setPeriodInfo(null);
      return;
    }

    setFilterError("");
    setSelectedPdf(null);
    setFileError("");

    try {
      setIsFiltering(true);

      const data = await fetchOpenPeriodBySocialWork(code, socialWorks);

      if (!data) {
        setPeriodInfo(null);
        setInvoiceFrom("");
        setInvoiceTo("");
        setFilterError("No se encontró un período abierto para esta obra social.");
        return;
      }

      setPeriodInfo(data);
      setInvoiceFrom(data.nroFacturaDesde);
      setInvoiceTo(data.nroFacturaHasta);
    } finally {
      setIsFiltering(false);
    }
  }, [isFiltering, matchedSocialWork, socialWorkInput, socialWorks]);

  const handleSocialWorkInputChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      setSocialWorkInput(sanitizeInteger(event.target.value).slice(0, 6));
      setFilterError("");
    },
    []
  );

  const handleInvoiceFromChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      setInvoiceFrom(sanitizeInteger(event.target.value));
    },
    []
  );

  const handleInvoiceToChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      setInvoiceTo(sanitizeInteger(event.target.value));
    },
    []
  );

  const handleFileChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const nextFile = event.target.files?.[0] ?? null;

      setFileError("");

      if (!nextFile) {
        setSelectedPdf(null);
        return;
      }

      if (nextFile.type !== "application/pdf") {
        setSelectedPdf(null);
        setFileError("Solo se permiten archivos PDF.");
        event.target.value = "";
        return;
      }

      if (nextFile.size > MAX_PDF_SIZE_BYTES) {
        setSelectedPdf(null);
        setFileError("El archivo supera el máximo permitido de 10 MB.");
        event.target.value = "";
        return;
      }

      // Seguridad: esto mejora UX, pero el backend debe validar nuevamente todo.
      setSelectedPdf(nextFile);
    },
    []
  );

  const openFilePicker = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleSaveInvoiceRange = useCallback(async () => {
    if (!periodInfo || !invoiceRangeValid || isSavingInvoice || isLocked) {
      return;
    }

    try {
      setIsSavingInvoice(true);

      await saveInvoiceRangeRequest({
        periodId: periodInfo.id,
        socialWorkCode: periodInfo.obraSocialCodigo,
        invoiceFrom,
        invoiceTo,
      });

      setPeriodInfo((prev) =>
        prev
          ? {
              ...prev,
              nroFacturaDesde: invoiceFrom,
              nroFacturaHasta: invoiceTo,
            }
          : prev
      );
    } finally {
      setIsSavingInvoice(false);
    }
  }, [invoiceFrom, invoiceRangeValid, invoiceTo, isLocked, isSavingInvoice, periodInfo]);

  const handleUploadPdf = useCallback(async () => {
    if (!periodInfo || !selectedPdf || isUploadingPdf || isLocked) {
      return;
    }

    try {
      setIsUploadingPdf(true);

      await uploadInvoicePdfRequest({
        periodId: periodInfo.id,
        socialWorkCode: periodInfo.obraSocialCodigo,
        file: selectedPdf,
      });
    } finally {
      setIsUploadingPdf(false);
    }
  }, [isLocked, isUploadingPdf, periodInfo, selectedPdf]);

  const handleClosePeriod = useCallback(async () => {
    if (!periodInfo || isClosingPeriod || isLocked) {
      return;
    }

    const confirmed = window.confirm(
      "¿Seguro que querés cerrar este período? Esta acción es crítica y debe validarse en el backend."
    );

    if (!confirmed) {
      return;
    }

    try {
      setIsClosingPeriod(true);

      await closePeriodRequest({
        periodId: periodInfo.id,
        socialWorkCode: periodInfo.obraSocialCodigo,
      });

      setPeriodInfo((prev) =>
        prev
          ? {
              ...prev,
              estado: "CERRADO",
            }
          : prev
      );
    } finally {
      setIsClosingPeriod(false);
    }
  }, [isClosingPeriod, isLocked, periodInfo]);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Cierre de Período Facturista</h1>
        <p className={styles.subtitle}>
          Buscá la obra social, revisá el período abierto, grabá el rango de
          facturas, adjuntá el PDF y cerrá el período de forma segura.
        </p>
      </div>

      <section className={styles.filterCard}>
        <div className={styles.filterTopRow}>
          <button
            type="button"
            className={styles.backButton}
            onClick={handleBack}
          >
            <ArrowLeft size={18} />
            <span>Volver</span>
          </button>
        </div>

        <div className={styles.filterGrid}>
          <div className={styles.filterMain}>
            <div className={styles.formRow}>
              <div className={styles.fieldGroup}>
                <label className={styles.label} htmlFor="socialWorkCode">
                  Obra social
                </label>
                <div className={styles.inputIconWrap}>
                  <Search size={18} className={styles.inputIcon} />
                  <input
                    id="socialWorkCode"
                    list="socialWorksList"
                    className={styles.input}
                    value={socialWorkInput}
                    onChange={handleSocialWorkInputChange}
                    placeholder="Código de obra social"
                    inputMode="numeric"
                    autoComplete="off"
                    disabled={isLoadingSocialWorks || isFiltering}
                  />
                </div>

                <datalist id="socialWorksList">
                  {socialWorks.map((item) => (
                    <option key={item.code} value={item.code}>
                      {item.name}
                    </option>
                  ))}
                </datalist>

                <span className={styles.helperText}>
                  {isLoadingSocialWorks
                    ? "Cargando obras sociales..."
                    : matchedSocialWork
                    ? matchedSocialWork.name
                    : "Escribí o elegí un código válido desde la lista."}
                </span>
              </div>

              <button
                type="button"
                className={styles.primaryButton}
                onClick={handleFilter}
                disabled={
                  isLoadingSocialWorks || isFiltering || !socialWorkInput.trim()
                }
              >
                <Filter size={18} />
                <span>{isFiltering ? "Filtrando..." : "Filtrar"}</span>
              </button>
            </div>

            {filterError ? (
              <p className={styles.inlineError}>{filterError}</p>
            ) : null}
          </div>

          <div className={styles.filterSideInfo}>
            <div className={styles.sideInfoCard}>
              <span className={styles.sideInfoLabel}>CUIT</span>
              <strong className={styles.sideInfoValue}>
                {periodInfo?.cuit || matchedSocialWork?.cuit || "—"}
              </strong>
            </div>

            <div className={styles.sideInfoCard}>
              <span className={styles.sideInfoLabel}>Tipo factura</span>
              <strong className={styles.sideInfoValue}>
                {periodInfo?.tipoFactura || matchedSocialWork?.tipoFactura || "—"}
              </strong>
            </div>
          </div>
        </div>
      </section>

      {periodInfo ? (
        <>
          <section className={styles.mainCard}>
            <div className={styles.sectionBlock}>
              <div className={styles.sectionHeader}>
                <div className={styles.sectionHeaderText}>
                  <h2 className={styles.sectionTitle}>Contexto del período</h2>
                  <p className={styles.sectionDescription}>
                    Vista rápida del período abierto asociado a la obra social
                    seleccionada.
                  </p>
                </div>

                <span
                  className={`${styles.statusBadge} ${
                    isLocked
                      ? styles.statusBadgeDanger
                      : styles.statusBadgeSuccess
                  }`}
                >
                  {periodInfo.estado}
                </span>
              </div>

              <div className={styles.infoGrid}>
                <div className={styles.infoItem}>
                  <span className={styles.infoLabel}>Obra social</span>
                  <strong className={styles.infoValue}>
                    {periodInfo.obraSocialCodigo} · {periodInfo.obraSocialNombre}
                  </strong>
                </div>

                <div className={styles.infoItem}>
                  <span className={styles.infoLabel}>Período</span>
                  <strong className={styles.infoValue}>{periodInfo.periodo}</strong>
                </div>

                <div className={styles.infoItem}>
                  <span className={styles.infoLabel}>Fecha apertura</span>
                  <strong className={styles.infoValue}>
                    {formatDisplayDate(periodInfo.fechaApertura)}
                  </strong>
                </div>

                <div className={styles.infoItem}>
                  <span className={styles.infoLabel}>Factura actual</span>
                  <strong className={styles.infoValue}>
                    {periodInfo.nroFacturaDesde} - {periodInfo.nroFacturaHasta}
                  </strong>
                </div>
              </div>
            </div>

            <div className={styles.sectionDivider} />

            <div className={styles.sectionBlock}>
              <div className={styles.sectionHeaderText}>
                <h2 className={styles.sectionTitle}>Números de factura</h2>
                <p className={styles.sectionDescription}>
                  Actualizá el rango a utilizar. El backend debe revalidar estado,
                  unicidad y consistencia antes de guardar.
                </p>
              </div>

              <div className={styles.formLayout}>
                <div className={styles.fieldGroup}>
                  <label className={styles.label} htmlFor="invoiceFrom">
                    Desde
                  </label>
                  <input
                    id="invoiceFrom"
                    className={styles.input}
                    value={invoiceFrom}
                    onChange={handleInvoiceFromChange}
                    inputMode="numeric"
                    autoComplete="off"
                    disabled={isLocked || isSavingInvoice}
                    placeholder="0"
                  />
                </div>

                <div className={styles.fieldGroup}>
                  <label className={styles.label} htmlFor="invoiceTo">
                    Hasta
                  </label>
                  <input
                    id="invoiceTo"
                    className={styles.input}
                    value={invoiceTo}
                    onChange={handleInvoiceToChange}
                    inputMode="numeric"
                    autoComplete="off"
                    disabled={isLocked || isSavingInvoice}
                    placeholder="0"
                  />
                </div>
              </div>

              {!invoiceRangeValid && (invoiceFrom || invoiceTo) ? (
                <p className={styles.inlineWarning}>
                  El rango debe ser válido y el número inicial no puede ser mayor
                  al final.
                </p>
              ) : null}

              <div className={styles.actionRow}>
                <button
                  type="button"
                  className={styles.primaryButton}
                  onClick={handleSaveInvoiceRange}
                  disabled={!invoiceRangeValid || isSavingInvoice || isLocked}
                >
                  <Save size={18} />
                  <span>
                    {isSavingInvoice ? "Grabando..." : "Grabar factura"}
                  </span>
                </button>
              </div>
            </div>

            <div className={styles.sectionDivider} />

            <div className={styles.sectionBlock}>
              <div className={styles.sectionHeaderText}>
                <h2 className={styles.sectionTitle}>PDF de factura</h2>
                <p className={styles.sectionDescription}>
                  Adjuntá el comprobante en PDF. El frontend filtra tipo y tamaño,
                  pero el backend debe volver a validar el archivo.
                </p>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="application/pdf"
                className={styles.hiddenInput}
                onChange={handleFileChange}
              />

              <div className={styles.uploadPanel}>
                <div className={styles.filePreview}>
                  <div className={styles.fileIconBox}>
                    <FileText size={18} />
                  </div>

                  <div className={styles.fileTextBlock}>
                    <strong className={styles.fileName}>
                      {selectedPdf ? selectedPdf.name : "Ningún archivo seleccionado"}
                    </strong>
                    <span className={styles.fileMeta}>
                      {selectedPdf
                        ? `${(selectedPdf.size / 1024 / 1024).toFixed(2)} MB`
                        : "Solo PDF · máximo 10 MB"}
                    </span>
                  </div>
                </div>

                <div className={styles.uploadActions}>
                  <button
                    type="button"
                    className={styles.secondaryButton}
                    onClick={openFilePicker}
                    disabled={isLocked}
                  >
                    <Upload size={18} />
                    <span>Seleccionar PDF</span>
                  </button>

                  <button
                    type="button"
                    className={styles.primaryMutedButton}
                    onClick={handleUploadPdf}
                    disabled={!selectedPdf || isUploadingPdf || isLocked}
                  >
                    <Upload size={18} />
                    <span>{isUploadingPdf ? "Subiendo..." : "Subir PDF"}</span>
                  </button>
                </div>
              </div>

              {fileError ? <p className={styles.inlineError}>{fileError}</p> : null}
            </div>

            <div className={styles.sectionDivider} />

            <div className={styles.sectionBlock}>
              <div className={styles.dangerCard}>
                <div className={styles.dangerContent}>
                  <div className={styles.dangerIcon}>
                    {isLocked ? <Lock size={18} /> : <AlertTriangle size={18} />}
                  </div>

                  <div className={styles.dangerText}>
                    <h3 className={styles.dangerTitle}>
                      {isLocked ? "Período cerrado" : "Cerrar período"}
                    </h3>
                    <p className={styles.dangerDescription}>
                      {isLocked
                        ? "Este período ya fue cerrado y no debería aceptar nuevas modificaciones."
                        : "Acción crítica. Antes de cerrar, el backend debe revalidar permisos, estado y consistencia de los datos."}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  className={styles.dangerButton}
                  onClick={handleClosePeriod}
                  disabled={isClosingPeriod || isLocked}
                >
                  {isClosingPeriod ? "Cerrando..." : "Cerrar período"}
                </button>
              </div>
            </div>
          </section>

          <section className={styles.totalCard}>
            <span className={styles.totalLabel}>Total acumulado</span>
            <strong className={styles.totalValue}>
              ${formatCurrency(periodInfo.totalAcumulado)}
            </strong>
          </section>
        </>
      ) : (
        <section className={styles.emptyStateCard}>
          <h2 className={styles.emptyStateTitle}>Todavía no hay un período cargado</h2>
          <p className={styles.emptyStateDescription}>
            Elegí una obra social y presioná <strong>Filtrar</strong> para traer el
            período abierto desde backend.
          </p>
        </section>
      )}
    </div>
  );
};

export default CierrePeriodoFacturista;