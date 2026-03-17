import {
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import {
  ArrowLeft,
  Building2,
  ChevronDown,
  FileText,
  Filter,
  Lock,
  Save,
  Search,
  Upload,
  AlertTriangle,
  X,
} from "lucide-react";
import styles from "./CierrePeriodoFacturista.module.scss";

type PeriodStatus = "ABIERTO" | "CERRADO";

type SocialWorkOption = {
  code: string;
  name: string;
  cuit: string;
  tipoFactura: string;
  searchText: string;
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

type SearchableOption = {
  id: string;
  primary: string;
  secondary?: string;
  meta?: string;
  searchText: string;
};

type SearchableSelectProps = {
  inputId: string;
  label: string;
  placeholder: string;
  searchPlaceholder: string;
  emptyMessage: string;
  loadingMessage: string;
  helperText?: string;
  disabled?: boolean;
  loading?: boolean;
  error?: string | null;
  isOpen: boolean;
  setIsOpen: (next: boolean) => void;
  query: string;
  onQueryChange: (value: string) => void;
  options: SearchableOption[];
  selected: SearchableOption | null;
  onSelect: (option: SearchableOption) => void;
  onClear?: () => void;
  resultsText?: string;
};

const API_BASE =
  (import.meta as any).env?.VITE_API_URL?.toString?.() ||
  (import.meta as any).env?.VITE_API_BASE?.toString?.() ||
  "/api";

const ENDPOINTS = {
  obrasSociales: `${API_BASE}/api/obras_social/`,
};

const MAX_PDF_SIZE_BYTES = 10 * 1024 * 1024;
const MAX_IDLE_OS_RESULTS = 80;

const cx = (...classes: Array<string | false | null | undefined>) =>
  classes.filter(Boolean).join(" ");

const normalize = (value: string) =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();

const safeStr = (value: unknown) => {
  if (value === null || value === undefined) return "";
  return String(value);
};

const sanitizeInteger = (value: string) =>
  value.replace(/\D/g, "").slice(0, 12);

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

const mapObraSocialRawToOption = (raw: any): SocialWorkOption => {
  const code = safeStr(
    raw?.NRO_OBRA_SOCIAL ??
      raw?.NRO_OBRASOCIAL ??
      raw?.nro_obra_social ??
      raw?.nro_obrasocial
  ).trim();

  const name = safeStr(
    raw?.NOMBRE ?? raw?.OBRA_SOCIAL ?? raw?.obra_social ?? raw?.nombre
  ).trim();

  const cuit = safeStr(raw?.CUIT ?? raw?.cuit).trim();
  const tipoFactura = safeStr(
    raw?.TIPO_FACT ?? raw?.TIPO_FACTURA ?? raw?.tipo_fact ?? raw?.tipoFactura
  ).trim();

  return {
    code,
    name,
    cuit,
    tipoFactura,
    searchText: normalize(`${code} ${name} ${cuit} ${tipoFactura}`),
  };
};

const fetchSocialWorks = async (
  signal?: AbortSignal
): Promise<SocialWorkOption[]> => {
  const { data } = await axios.get(ENDPOINTS.obrasSociales, {
    signal,
    timeout: 20_000,
  } as any);

  const array = Array.isArray(data) ? data : [];

  return array
    .map(mapObraSocialRawToOption)
    .filter((item) => item.code && item.name)
    .sort((a, b) => a.name.localeCompare(b.name, "es"));
};

/**
 * TODO backend:
 * Reemplazar por endpoint real que traiga el período abierto de la obra social.
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
    tipoFactura: selected.tipoFactura || "B",
    cuit: selected.cuit || "—",
    fechaApertura: "2026-02-06",
    totalAcumulado: 42059901.66,
    nroFacturaDesde: "0",
    nroFacturaHasta: "0",
  };
};

/**
 * TODO backend:
 * POST real para guardar rango de factura.
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
 */
const closePeriodRequest = async (_payload: {
  periodId: string;
  socialWorkCode: string;
}) => {
  await new Promise((resolve) => setTimeout(resolve, 500));
};

function SearchableSelect({
  inputId,
  label,
  placeholder,
  searchPlaceholder,
  emptyMessage,
  loadingMessage,
  helperText,
  disabled = false,
  loading = false,
  error = null,
  isOpen,
  setIsOpen,
  query,
  onQueryChange,
  options,
  selected,
  onSelect,
  onClear,
  resultsText,
}: SearchableSelectProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    searchInputRef.current?.focus();
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const handleOutsideClick = (event: MouseEvent) => {
      if (!rootRef.current) return;
      if (!rootRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    window.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      window.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen, setIsOpen]);

  const hasClear = Boolean(selected || query.trim());

  return (
    <div className={styles.fieldGroup}>
      <label htmlFor={inputId} className={styles.label}>
        {label}
      </label>

      <div
        ref={rootRef}
        className={cx(
          styles.combobox,
          isOpen && styles.comboboxOpen,
          disabled && styles.comboboxDisabled
        )}
      >
        <div className={styles.comboboxControl}>
          <button
            id={inputId}
            type="button"
            className={cx(styles.comboboxButton, selected && styles.comboboxFilled)}
            onClick={() => {
              if (!disabled) {
                setIsOpen(!isOpen);
              }
            }}
            aria-expanded={isOpen}
            aria-haspopup="listbox"
            aria-controls={`${inputId}-listbox`}
            disabled={disabled}
          >
            <span className={styles.comboboxMain}>
              <span className={styles.comboboxIcon}>
                <Building2 size={18} />
              </span>

              <span className={styles.comboboxText}>
                <span
                  className={cx(
                    styles.comboboxValue,
                    !selected && styles.comboboxPlaceholder
                  )}
                >
                  {selected ? selected.primary : placeholder}
                </span>

                <span className={styles.comboboxMeta}>
                  {selected
                    ? [selected.secondary, selected.meta].filter(Boolean).join(" • ")
                    : helperText || "Seleccioná una opción"}
                </span>
              </span>
            </span>

            <span className={styles.comboboxActions}>
              <ChevronDown
                size={18}
                className={cx(styles.chevron, isOpen && styles.chevronOpen)}
              />
            </span>
          </button>

          {hasClear && onClear ? (
            <button
              type="button"
              className={styles.clearIconButton}
              onClick={onClear}
              aria-label={`Limpiar ${label}`}
              title={`Limpiar ${label}`}
            >
              <X size={15} />
            </button>
          ) : null}
        </div>

        {isOpen ? (
          <div className={styles.dropdown}>
            <div className={styles.dropdownSearch}>
              <Search className={styles.dropdownSearchIcon} size={16} />
              <input
                ref={searchInputRef}
                className={styles.dropdownInput}
                value={query}
                onChange={(event) => onQueryChange(event.target.value)}
                placeholder={searchPlaceholder}
                inputMode="search"
                autoComplete="off"
              />
            </div>

            <div className={styles.dropdownMetaBar}>
              {loading ? (
                <span>{loadingMessage}</span>
              ) : error ? (
                <span>{error}</span>
              ) : (
                <span>{resultsText ?? `${options.length} resultado(s)`}</span>
              )}
            </div>

            <div
              id={`${inputId}-listbox`}
              className={styles.dropdownList}
              role="listbox"
            >
              {loading ? (
                <div className={styles.dropdownEmpty}>{loadingMessage}</div>
              ) : error ? (
                <div className={styles.dropdownError}>{error}</div>
              ) : options.length === 0 ? (
                <div className={styles.dropdownEmpty}>{emptyMessage}</div>
              ) : (
                options.map((option) => {
                  const active = selected?.id === option.id;

                  return (
                    <button
                      key={option.id}
                      type="button"
                      role="option"
                      aria-selected={active}
                      className={cx(
                        styles.dropdownItem,
                        active && styles.dropdownItemActive
                      )}
                      onClick={() => {
                        onSelect(option);
                        setIsOpen(false);
                      }}
                    >
                      <span className={styles.dropdownItemPrimary}>
                        {option.primary}
                      </span>
                      {(option.secondary || option.meta) && (
                        <span className={styles.dropdownItemSecondary}>
                          {[option.secondary, option.meta]
                            .filter(Boolean)
                            .join(" • ")}
                        </span>
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </div>
        ) : null}
      </div>

      <span className={styles.helperText}>
        {loading ? loadingMessage : error ? error : helperText}
      </span>
    </div>
  );
}

const CierrePeriodoFacturista = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const filterAbortRef = useRef<AbortController | null>(null);

  const [socialWorks, setSocialWorks] = useState<SocialWorkOption[]>([]);
  const [isLoadingSocialWorks, setIsLoadingSocialWorks] = useState(true);
  const [socialWorksError, setSocialWorksError] = useState<string | null>(null);

  const [selectedSocialWork, setSelectedSocialWork] =
    useState<SocialWorkOption | null>(null);
  const [socialWorkOpen, setSocialWorkOpen] = useState(false);
  const [socialWorkQuery, setSocialWorkQuery] = useState("");

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

  const deferredSocialWorkQuery = useDeferredValue(socialWorkQuery);

  useEffect(() => {
    const controller = new AbortController();

    const loadSocialWorks = async () => {
      try {
        setIsLoadingSocialWorks(true);
        setSocialWorksError(null);

        const data = await fetchSocialWorks(controller.signal);
        if (controller.signal.aborted) return;

        setSocialWorks(data);
      } catch (error) {
        if ((error as Error).name !== "AbortError") {
          setSocialWorks([]);
          setSocialWorksError("No se pudieron cargar las obras sociales.");
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsLoadingSocialWorks(false);
        }
      }
    };

    void loadSocialWorks();

    return () => controller.abort();
  }, []);

  useEffect(() => {
    return () => {
      filterAbortRef.current?.abort();
    };
  }, []);

  const socialWorkOptions = useMemo<SearchableOption[]>(
    () =>
      socialWorks.map((item) => ({
        id: item.code,
        primary: item.name,
        secondary: item.code ? `Código ${item.code}` : undefined,
        meta: [item.cuit && `CUIT ${item.cuit}`, item.tipoFactura && `Factura ${item.tipoFactura}`]
          .filter(Boolean)
          .join(" • "),
        searchText: item.searchText,
      })),
    [socialWorks]
  );

  const selectedSocialWorkOption = useMemo<SearchableOption | null>(() => {
    if (!selectedSocialWork) return null;

    return {
      id: selectedSocialWork.code,
      primary: selectedSocialWork.name,
      secondary: selectedSocialWork.code
        ? `Código ${selectedSocialWork.code}`
        : undefined,
      meta: [
        selectedSocialWork.cuit && `CUIT ${selectedSocialWork.cuit}`,
        selectedSocialWork.tipoFactura &&
          `Factura ${selectedSocialWork.tipoFactura}`,
      ]
        .filter(Boolean)
        .join(" • "),
      searchText: selectedSocialWork.searchText,
    };
  }, [selectedSocialWork]);

  const filteredSocialWorkOptions = useMemo(() => {
    const query = normalize(deferredSocialWorkQuery);

    if (!query) {
      return socialWorkOptions.slice(0, MAX_IDLE_OS_RESULTS);
    }

    return socialWorkOptions.filter((option) =>
      option.searchText.includes(query)
    );
  }, [deferredSocialWorkQuery, socialWorkOptions]);

  const socialWorkResultsText = useMemo(() => {
    const query = normalize(deferredSocialWorkQuery);

    if (!query && socialWorkOptions.length > filteredSocialWorkOptions.length) {
      return `Mostrando ${filteredSocialWorkOptions.length} de ${socialWorkOptions.length}. Escribí para filtrar más.`;
    }

    return `${filteredSocialWorkOptions.length} resultado(s)`;
  }, [
    deferredSocialWorkQuery,
    filteredSocialWorkOptions.length,
    socialWorkOptions.length,
  ]);

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

  const handleSelectSocialWork = useCallback(
    (option: SearchableOption) => {
      const next = socialWorks.find((item) => item.code === option.id) ?? null;

      setSelectedSocialWork(next);
      setSocialWorkQuery("");
      setFilterError("");
      setFileError("");
      setSelectedPdf(null);
      setPeriodInfo(null);
      setInvoiceFrom("");
      setInvoiceTo("");
    },
    [socialWorks]
  );

  const handleClearSocialWork = useCallback(() => {
    filterAbortRef.current?.abort();
    setSelectedSocialWork(null);
    setSocialWorkQuery("");
    setSocialWorkOpen(false);
    setFilterError("");
    setFileError("");
    setSelectedPdf(null);
    setPeriodInfo(null);
    setInvoiceFrom("");
    setInvoiceTo("");
  }, []);

  const handleFilter = useCallback(async () => {
    if (!selectedSocialWork || isFiltering) {
      return;
    }

    filterAbortRef.current?.abort();
    const controller = new AbortController();
    filterAbortRef.current = controller;

    setFilterError("");
    setSelectedPdf(null);
    setFileError("");

    try {
      setIsFiltering(true);

      const data = await fetchOpenPeriodBySocialWork(
        selectedSocialWork.code,
        socialWorks,
        controller.signal
      );

      if (controller.signal.aborted) return;

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
    } catch (error) {
      if ((error as Error).name !== "AbortError") {
        setPeriodInfo(null);
        setInvoiceFrom("");
        setInvoiceTo("");
        setFilterError("No se pudo consultar el período abierto.");
      }
    } finally {
      if (filterAbortRef.current === controller) {
        filterAbortRef.current = null;
      }
      if (!controller.signal.aborted) {
        setIsFiltering(false);
      }
    }
  }, [isFiltering, selectedSocialWork, socialWorks]);

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

          {selectedSocialWork ? (
            <div className={styles.selectedBadge}>
              <Building2 size={16} />
              <span>{selectedSocialWork.name}</span>
            </div>
          ) : null}
        </div>

        <div className={styles.filterGrid}>
          <div className={styles.filterMain}>
            <div className={styles.formRow}>
              <SearchableSelect
                inputId="socialWorkCode"
                label="Obra social"
                placeholder="Seleccioná una obra social"
                searchPlaceholder="Buscar por nombre, código, CUIT o tipo…"
                emptyMessage={
                  socialWorkQuery.trim()
                    ? `Sin resultados para "${socialWorkQuery}"`
                    : "No hay obras sociales disponibles"
                }
                loadingMessage="Cargando obras sociales..."
                helperText={
                  selectedSocialWork
                    ? `Código ${selectedSocialWork.code}`
                    : "Elegí una obra social desde la base de datos."
                }
                disabled={isLoadingSocialWorks || isFiltering}
                loading={isLoadingSocialWorks}
                error={socialWorksError}
                isOpen={socialWorkOpen}
                setIsOpen={setSocialWorkOpen}
                query={socialWorkQuery}
                onQueryChange={setSocialWorkQuery}
                options={filteredSocialWorkOptions}
                selected={selectedSocialWorkOption}
                onSelect={handleSelectSocialWork}
                onClear={handleClearSocialWork}
                resultsText={socialWorkResultsText}
              />

              <button
                type="button"
                className={styles.primaryButton}
                onClick={handleFilter}
                disabled={
                  isLoadingSocialWorks || isFiltering || !selectedSocialWork
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
                {periodInfo?.cuit || selectedSocialWork?.cuit || "—"}
              </strong>
            </div>

            <div className={styles.sideInfoCard}>
              <span className={styles.sideInfoLabel}>Tipo factura</span>
              <strong className={styles.sideInfoValue}>
                {periodInfo?.tipoFactura ||
                  selectedSocialWork?.tipoFactura ||
                  "—"}
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
                      {selectedPdf
                        ? selectedPdf.name
                        : "Ningún archivo seleccionado"}
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