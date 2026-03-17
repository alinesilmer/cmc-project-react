import {
  memo,
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";
import axios from "axios";
import type { LucideIcon } from "lucide-react";
import {
  Building2,
  CalendarDays,
  ChevronDown,
  DollarSign,
  Eye,
  Search,
  Stethoscope,
  WalletCards,
  X,
} from "lucide-react";

import styles from "./CargaFacturacion.module.scss";
import Button from "../../../../website/components/UI/Button/Button";

type TipoPrestacion =
  | "CONSULTA"
  | "PRACTICA"
  | "HONORARIO"
  | "SANATORIO";

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

type ObraSocial = {
  NRO_OBRA_SOCIAL: number;
  NOMBRE: string;
  CODIGO?: string | null;
  ACTIVA?: "S" | "N" | string;
};

type DoctorOption = {
  id: string;
  socioValue: string;
  nombre: string;
  matriculaProv: string;
  especialidad: string;
  searchText: string;
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

type PreviewSection = {
  title: string;
  items: Array<{
    label: string;
    value: string;
  }>;
};

type PreviewModalProps = {
  open: boolean;
  onClose: () => void;
  sections: PreviewSection[];
  rawJson: string;
};

const API_BASE =
  (import.meta as any).env?.VITE_API_URL?.toString?.() ||
  (import.meta as any).env?.VITE_API_BASE?.toString?.() ||
  "/api";

const ENDPOINTS = {
  obrasSociales: `${API_BASE}/api/obras_social/`,
  medicosByOS: (nroOS: number) =>
    `${API_BASE}/api/padrones/obras-sociales/${nroOS}/medicos`,
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
  codigoPrestacion: 30,
  validacion: 40,
  nroAfiliado: 40,
  nombreAfiliado: 120,
  sesion: 3,
  cantidad: 3,
};

const MAX_IDLE_OS_RESULTS = 80;
const MAX_IDLE_DOCTOR_RESULTS = 80;

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

const getDisplayValue = (value: unknown) => {
  const text = safeStr(value).trim();
  return text || "Pendiente";
};

const sanitizeDecimal = (value: string) => {
  const cleaned = value.replace(/[^\d.,-]/g, "");
  const normalized = cleaned.replace(",", ".");
  const parts = normalized.split(".");

  if (parts.length <= 1) {
    return normalized;
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

const formatMoneyField = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) return "Pendiente";
  return `$${formatCurrency(toSafeNumber(trimmed))}`;
};

const formatDateLabel = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) return "Pendiente";

  const [year, month, day] = trimmed.split("-");
  if (!year || !month || !day) return trimmed;

  return `${day}/${month}/${year}`;
};

const buildOsCode = (os: Pick<ObraSocial, "CODIGO" | "NRO_OBRA_SOCIAL">) =>
  os.CODIGO ?? `OS${String(os.NRO_OBRA_SOCIAL).padStart(3, "0")}`;

const coerceToStringArray = (value: any): string[] => {
  if (!value) return [];
  if (Array.isArray(value)) return value.map((item) => safeStr(item));
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return [];
    if (/[;,|]/.test(trimmed)) {
      return trimmed.split(/[;,|]/g).map((item) => item.trim());
    }
    return [trimmed];
  }
  return [];
};

const cleanEspecialidades = (items: string[]) => {
  const out: string[] = [];
  const seen = new Set<string>();

  for (const raw of items) {
    const trimmed = safeStr(raw).trim();
    if (!trimmed || trimmed === "0") continue;

    const key = normalize(trimmed);
    if (!key || seen.has(key)) continue;

    seen.add(key);
    out.push(trimmed);
  }

  return out;
};

const unwrapPrestadorSource = (item: any) =>
  item?.prestador ?? item?.medico ?? item?.doctor ?? item?.data ?? item?.item ?? item;

const pickDoctorName = (item: any) => {
  const src = unwrapPrestadorSource(item);
  return safeStr(
    src?.APELLIDO_NOMBRE ??
      src?.apellido_nombre ??
      src?.APE_NOM ??
      src?.ape_nom ??
      src?.NOMBRE ??
      src?.nombre ??
      item?.APELLIDO_NOMBRE ??
      item?.apellido_nombre ??
      item?.APE_NOM ??
      item?.ape_nom ??
      item?.NOMBRE ??
      item?.nombre
  ).trim();
};

const pickDoctorSocio = (item: any) => {
  const src = unwrapPrestadorSource(item);
  return safeStr(
    src?.NRO_SOCIO ??
      src?.nro_socio ??
      src?.SOCIO ??
      src?.socio ??
      item?.NRO_SOCIO ??
      item?.nro_socio ??
      item?.SOCIO ??
      item?.socio
  ).trim();
};

const pickDoctorId = (item: any) => {
  const src = unwrapPrestadorSource(item);
  return safeStr(src?.ID ?? src?.id ?? item?.ID ?? item?.id).trim();
};

const pickDoctorMatricula = (item: any) => {
  const src = unwrapPrestadorSource(item);
  return safeStr(
    src?.MATRICULA_PROV ??
      src?.matricula_prov ??
      item?.MATRICULA_PROV ??
      item?.matricula_prov
  ).trim();
};

const pickDoctorEspecialidad = (item: any) => {
  const src = unwrapPrestadorSource(item);

  const especialidadesRaw =
    src?.ESPECIALIDADES ??
    src?.especialidades ??
    item?.ESPECIALIDADES ??
    item?.especialidades ??
    null;

  const especialidadSingle =
    src?.ESPECIALIDAD ??
    src?.especialidad ??
    item?.ESPECIALIDAD ??
    item?.especialidad ??
    null;

  const list = cleanEspecialidades(coerceToStringArray(especialidadesRaw));
  if (list.length > 0) return list.slice(0, 3).join(", ");

  return safeStr(especialidadSingle).trim();
};

const mapObraSocialRawToOS = (raw: any): ObraSocial => {
  const nro =
    raw?.NRO_OBRA_SOCIAL ??
    raw?.NRO_OBRASOCIAL ??
    raw?.nro_obra_social ??
    raw?.nro_obrasocial ??
    0;

  const nombre =
    raw?.NOMBRE ?? raw?.OBRA_SOCIAL ?? raw?.obra_social ?? raw?.nombre ?? "";

  const codigo =
    raw?.CODIGO ??
    (Number.isFinite(Number(nro))
      ? `OS${String(Number(nro)).padStart(3, "0")}`
      : null);

  const activa = raw?.ACTIVA ?? raw?.MARCA ?? undefined;

  return {
    NRO_OBRA_SOCIAL: Number(nro),
    NOMBRE: String(nombre),
    CODIGO: codigo,
    ACTIVA: activa,
  };
};

const mapItemToDoctorOption = (item: any): DoctorOption => {
  const id = pickDoctorId(item);
  const socioValue = pickDoctorSocio(item);
  const nombre = pickDoctorName(item);
  const matriculaProv = pickDoctorMatricula(item);
  const especialidad = pickDoctorEspecialidad(item);

  const stableId = id || socioValue || `${nombre}-${matriculaProv}`;

  return {
    id: stableId,
    socioValue: socioValue || stableId,
    nombre: nombre || "Prestador sin nombre",
    matriculaProv,
    especialidad,
    searchText: normalize(
      `${nombre} ${socioValue} ${matriculaProv} ${especialidad}`
    ),
  };
};

async function fetchObrasSociales(signal?: AbortSignal): Promise<ObraSocial[]> {
  const { data } = await axios.get(ENDPOINTS.obrasSociales, {
    signal,
    timeout: 20_000,
  } as any);

  const array = Array.isArray(data) ? data : [];

  return array
    .map(mapObraSocialRawToOS)
    .sort((a, b) => a.NOMBRE.localeCompare(b.NOMBRE, "es"));
}

async function fetchDoctorsByOS(
  nroOS: number,
  signal?: AbortSignal
): Promise<DoctorOption[]> {
  const PAGE_SIZE = 200;
  let page = 1;
  let total: number | null = null;
  const doctors: DoctorOption[] = [];

  while (true) {
    if (signal?.aborted) break;

    const { data } = await axios.get(ENDPOINTS.medicosByOS(nroOS), {
      params: { page, size: PAGE_SIZE },
      timeout: 25_000,
      signal,
    } as any);

    if (Array.isArray(data)) {
      const mapped = data.map(mapItemToDoctorOption);
      const unique = new Map<string, DoctorOption>();

      mapped.forEach((doctor) => {
        if (!unique.has(doctor.id)) {
          unique.set(doctor.id, doctor);
        }
      });

      return Array.from(unique.values()).sort((a, b) =>
        a.nombre.localeCompare(b.nombre, "es")
      );
    }

    const items = Array.isArray(data?.items) ? data.items : [];
    total = Number.isFinite(data?.total) ? Number(data.total) : total;

    items.forEach((item: any) => {
      doctors.push(mapItemToDoctorOption(item));
    });

    if (items.length === 0) break;
    if (total !== null && doctors.length >= total) break;

    page += 1;
    if (page > 10_000) break;
  }

  const unique = new Map<string, DoctorOption>();

  doctors.forEach((doctor) => {
    if (!unique.has(doctor.id)) {
      unique.set(doctor.id, doctor);
    }
  });

  return Array.from(unique.values()).sort((a, b) =>
    a.nombre.localeCompare(b.nombre, "es")
  );
}

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

const PreviewModal = memo(function PreviewModal({
  open,
  onClose,
  sections,
  rawJson,
}: PreviewModalProps) {
  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className={styles.modalOverlay}
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
      role="presentation"
    >
      <div
        className={styles.modalContent}
        role="dialog"
        aria-modal="true"
        aria-labelledby="preview-order-title"
      >
        <div className={styles.modalHeader}>
          <div className={styles.modalHeaderMain}>
            <h2 id="preview-order-title" className={styles.modalTitle}>
              Vista previa de la orden
            </h2>
            <p className={styles.modalSubtitle}>
              Visualización completa de los datos actuales del formulario.
            </p>
          </div>

          <button
            type="button"
            className={styles.modalCloseButton}
            onClick={onClose}
            aria-label="Cerrar vista previa"
            title="Cerrar vista previa"
          >
            <X size={18} />
          </button>
        </div>

        <div className={styles.modalBody}>
          <div className={styles.previewGrid}>
            {sections.map((section) => (
              <section key={section.title} className={styles.previewSection}>
                <h3 className={styles.previewSectionTitle}>{section.title}</h3>

                <div className={styles.previewList}>
                  {section.items.map((item) => (
                    <div key={`${section.title}-${item.label}`} className={styles.previewItem}>
                      <span className={styles.previewItemLabel}>{item.label}</span>
                      <span className={styles.previewItemValue}>{item.value}</span>
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>

          <section className={styles.previewJsonCard}>
            <div className={styles.previewJsonHeader}>
              <h3 className={styles.previewSectionTitle}>Payload técnico</h3>
            </div>

            <pre className={styles.previewJson}>{rawJson}</pre>
          </section>
        </div>
      </div>
    </div>
  );
});

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
    <div className={styles.formGroup}>
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
                    : helperText || " "}
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
    </div>
  );
}

const CargaFacturacion = () => {
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);

  const [obrasSociales, setObrasSociales] = useState<ObraSocial[]>([]);
  const [loadingObras, setLoadingObras] = useState(true);
  const [errorObras, setErrorObras] = useState<string | null>(null);

  const [selectedObraSocial, setSelectedObraSocial] = useState<ObraSocial | null>(
    null
  );
  const [obraSocialOpen, setObraSocialOpen] = useState(false);
  const [obraSocialQuery, setObraSocialQuery] = useState("");

  const [doctors, setDoctors] = useState<DoctorOption[]>([]);
  const [loadingDoctors, setLoadingDoctors] = useState(false);
  const [errorDoctors, setErrorDoctors] = useState<string | null>(null);

  const [selectedDoctor, setSelectedDoctor] = useState<DoctorOption | null>(null);
  const [doctorOpen, setDoctorOpen] = useState(false);
  const [doctorQuery, setDoctorQuery] = useState("");

  const deferredObraSocialQuery = useDeferredValue(obraSocialQuery);
  const deferredDoctorQuery = useDeferredValue(doctorQuery);

  useEffect(() => {
    const controller = new AbortController();

    (async () => {
      try {
        setLoadingObras(true);
        setErrorObras(null);

        const rows = await fetchObrasSociales(controller.signal);
        if (controller.signal.aborted) return;

        setObrasSociales(rows);
      } catch {
        if (controller.signal.aborted) return;
        setErrorObras("No se pudieron cargar las obras sociales.");
      } finally {
        if (controller.signal.aborted) return;
        setLoadingObras(false);
      }
    })();

    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (!selectedObraSocial?.NRO_OBRA_SOCIAL) {
      setDoctors([]);
      setSelectedDoctor(null);
      setErrorDoctors(null);
      setLoadingDoctors(false);
      return;
    }

    const controller = new AbortController();

    (async () => {
      try {
        setLoadingDoctors(true);
        setErrorDoctors(null);

        const rows = await fetchDoctorsByOS(
          selectedObraSocial.NRO_OBRA_SOCIAL,
          controller.signal
        );

        if (controller.signal.aborted) return;
        setDoctors(rows);
      } catch {
        if (controller.signal.aborted) return;
        setDoctors([]);
        setErrorDoctors(
          "No se pudieron cargar los médicos para la obra social seleccionada."
        );
      } finally {
        if (controller.signal.aborted) return;
        setLoadingDoctors(false);
      }
    })();

    return () => controller.abort();
  }, [selectedObraSocial?.NRO_OBRA_SOCIAL]);

  const handleChange = useCallback(
    (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
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

    const total = (honorarios + gastos - coseguro) * cantidad;
    return total > 0 ? total : 0;
  }, [form.honorarios, form.gastos, form.coseguro, form.cantidad]);

  const currentPayload = useMemo(
    () => buildRequestPayload(form, valorPrestacion),
    [form, valorPrestacion]
  );

  const obraSocialOptions = useMemo<SearchableOption[]>(
    () =>
      obrasSociales.map((os) => ({
        id: String(os.NRO_OBRA_SOCIAL),
        primary: os.NOMBRE,
        secondary: buildOsCode(os),
        meta:
          os.ACTIVA === "N"
            ? "Inactiva"
            : os.ACTIVA === "S"
            ? "Activa"
            : undefined,
        searchText: normalize(
          `${os.NOMBRE} ${buildOsCode(os)} ${os.NRO_OBRA_SOCIAL}`
        ),
      })),
    [obrasSociales]
  );

  const selectedObraSocialOption = useMemo<SearchableOption | null>(() => {
    if (!selectedObraSocial) return null;

    return {
      id: String(selectedObraSocial.NRO_OBRA_SOCIAL),
      primary: selectedObraSocial.NOMBRE,
      secondary: buildOsCode(selectedObraSocial),
      meta:
        selectedObraSocial.ACTIVA === "N"
          ? "Inactiva"
          : selectedObraSocial.ACTIVA === "S"
          ? "Activa"
          : undefined,
      searchText: normalize(
        `${selectedObraSocial.NOMBRE} ${buildOsCode(selectedObraSocial)}`
      ),
    };
  }, [selectedObraSocial]);

  const filteredObraSocialOptions = useMemo(() => {
    const query = normalize(deferredObraSocialQuery);

    if (!query) {
      return obraSocialOptions.slice(0, MAX_IDLE_OS_RESULTS);
    }

    return obraSocialOptions.filter((option) =>
      option.searchText.includes(query)
    );
  }, [deferredObraSocialQuery, obraSocialOptions]);

  const doctorOptions = useMemo<SearchableOption[]>(
    () =>
      doctors.map((doctor) => ({
        id: doctor.id,
        primary: doctor.nombre,
        secondary: doctor.socioValue
          ? `Socio ${doctor.socioValue}`
          : "Sin socio",
        meta: [doctor.matriculaProv && `MP ${doctor.matriculaProv}`, doctor.especialidad]
          .filter(Boolean)
          .join(" • "),
        searchText: doctor.searchText,
      })),
    [doctors]
  );

  const selectedDoctorOption = useMemo<SearchableOption | null>(() => {
    if (!selectedDoctor) return null;

    return {
      id: selectedDoctor.id,
      primary: selectedDoctor.nombre,
      secondary: selectedDoctor.socioValue
        ? `Socio ${selectedDoctor.socioValue}`
        : "Sin socio",
      meta: [
        selectedDoctor.matriculaProv && `MP ${selectedDoctor.matriculaProv}`,
        selectedDoctor.especialidad,
      ]
        .filter(Boolean)
        .join(" • "),
      searchText: selectedDoctor.searchText,
    };
  }, [selectedDoctor]);

  const filteredDoctorOptions = useMemo(() => {
    const query = normalize(deferredDoctorQuery);

    if (!query) {
      return doctorOptions.slice(0, MAX_IDLE_DOCTOR_RESULTS);
    }

    return doctorOptions.filter((option) => option.searchText.includes(query));
  }, [deferredDoctorQuery, doctorOptions]);

  const obraSocialResultsText = useMemo(() => {
    const query = normalize(deferredObraSocialQuery);

    if (!query && obraSocialOptions.length > filteredObraSocialOptions.length) {
      return `Mostrando ${filteredObraSocialOptions.length} de ${obraSocialOptions.length}. Escribí para filtrar más.`;
    }

    return `${filteredObraSocialOptions.length} resultado(s)`;
  }, [
    deferredObraSocialQuery,
    filteredObraSocialOptions.length,
    obraSocialOptions.length,
  ]);

  const doctorResultsText = useMemo(() => {
    const query = normalize(deferredDoctorQuery);

    if (!selectedObraSocial) {
      return "Primero seleccioná una obra social";
    }

    if (!query && doctorOptions.length > filteredDoctorOptions.length) {
      return `Mostrando ${filteredDoctorOptions.length} de ${doctorOptions.length}. Escribí para filtrar más.`;
    }

    return `${filteredDoctorOptions.length} resultado(s)`;
  }, [
    deferredDoctorQuery,
    doctorOptions.length,
    filteredDoctorOptions.length,
    selectedObraSocial,
  ]);

  const handleSelectObraSocial = useCallback(
    (option: SearchableOption) => {
      const next = obrasSociales.find(
        (os) => String(os.NRO_OBRA_SOCIAL) === option.id
      );
      if (!next) return;

      setSelectedObraSocial(next);
      setSelectedDoctor(null);
      setDoctors([]);
      setDoctorQuery("");
      setDoctorOpen(false);
      setObraSocialQuery("");

      setForm((prev) => ({
        ...prev,
        obraSocial: String(next.NRO_OBRA_SOCIAL),
        doctor: "",
      }));
    },
    [obrasSociales]
  );

  const handleClearObraSocial = useCallback(() => {
    setSelectedObraSocial(null);
    setSelectedDoctor(null);
    setDoctors([]);
    setErrorDoctors(null);
    setObraSocialQuery("");
    setDoctorQuery("");
    setObraSocialOpen(false);
    setDoctorOpen(false);

    setForm((prev) => ({
      ...prev,
      obraSocial: "",
      doctor: "",
    }));
  }, []);

  const handleSelectDoctor = useCallback(
    (option: SearchableOption) => {
      const next = doctors.find((doctor) => doctor.id === option.id);
      if (!next) return;

      setSelectedDoctor(next);
      setDoctorQuery("");

      setForm((prev) => ({
        ...prev,
        doctor: next.socioValue || next.id,
      }));
    },
    [doctors]
  );

  const handleClearDoctor = useCallback(() => {
    setSelectedDoctor(null);
    setDoctorQuery("");
    setDoctorOpen(false);

    setForm((prev) => ({
      ...prev,
      doctor: "",
    }));
  }, []);

  const handleOpenPreview = useCallback(() => {
    setObraSocialOpen(false);
    setDoctorOpen(false);
    setPreviewOpen(true);
  }, []);

  const handleClosePreview = useCallback(() => {
    setPreviewOpen(false);
  }, []);

  const isSubmitDisabled = useMemo(() => {
    return (
      isSubmitting ||
      !form.obraSocial ||
      !form.doctor ||
      !form.codigoPrestacion.trim() ||
      !form.nroAfiliado.trim() ||
      !form.nombreAfiliado.trim() ||
      !form.fechaPrestacion
    );
  }, [
    form.codigoPrestacion,
    form.doctor,
    form.fechaPrestacion,
    form.nombreAfiliado,
    form.nroAfiliado,
    form.obraSocial,
    isSubmitting,
  ]);

  const previewSections = useMemo<PreviewSection[]>(
    () => [
      {
        title: "Prestación",
        items: [
          {
            label: "Obra social",
            value: selectedObraSocial
              ? `${selectedObraSocial.NOMBRE} (${buildOsCode(selectedObraSocial)})`
              : "Pendiente",
          },
          {
            label: "Doctor",
            value: selectedDoctor
              ? [
                  selectedDoctor.nombre,
                  selectedDoctor.socioValue
                    ? `Socio ${selectedDoctor.socioValue}`
                    : "",
                  selectedDoctor.matriculaProv
                    ? `MP ${selectedDoctor.matriculaProv}`
                    : "",
                ]
                  .filter(Boolean)
                  .join(" • ")
              : "Pendiente",
          },
          {
            label: "Especialidad",
            value: getDisplayValue(selectedDoctor?.especialidad),
          },
          {
            label: "Tipo",
            value: getDisplayValue(form.tipo),
          },
          {
            label: "Código prestación",
            value: getDisplayValue(form.codigoPrestacion),
          },
          {
            label: "Honorarios",
            value: formatMoneyField(form.honorarios),
          },
          {
            label: "Gastos",
            value: formatMoneyField(form.gastos),
          },
          {
            label: "Coseguro",
            value: formatMoneyField(form.coseguro),
          },
          {
            label: "Cantidad",
            value: getDisplayValue(form.cantidad),
          },
          {
            label: "Valor prestación",
            value: `$${formatCurrency(valorPrestacion)}`,
          },
        ],
      },
      {
        title: "Afiliado",
        items: [
          {
            label: "Validación",
            value: getDisplayValue(form.validacion),
          },
          {
            label: "Nro. de afiliado",
            value: getDisplayValue(form.nroAfiliado),
          },
          {
            label: "Nombre afiliado",
            value: getDisplayValue(form.nombreAfiliado),
          },
          {
            label: "Sesión",
            value: getDisplayValue(form.sesion),
          },
          {
            label: "Fecha prestación",
            value: formatDateLabel(form.fechaPrestacion),
          },
        ],
      },
    ],
    [
      form.cantidad,
      form.codigoPrestacion,
      form.coseguro,
      form.fechaPrestacion,
      form.gastos,
      form.honorarios,
      form.nombreAfiliado,
      form.nroAfiliado,
      form.sesion,
      form.tipo,
      form.validacion,
      selectedDoctor,
      selectedObraSocial,
      valorPrestacion,
    ]
  );

  const previewJson = useMemo(
    () =>
      JSON.stringify(
        {
          ...currentPayload,
          obraSocialLabel: selectedObraSocial
            ? `${selectedObraSocial.NOMBRE} (${buildOsCode(selectedObraSocial)})`
            : null,
          doctorLabel: selectedDoctor?.nombre ?? null,
          doctorMatriculaProv: selectedDoctor?.matriculaProv ?? null,
          doctorEspecialidad: selectedDoctor?.especialidad ?? null,
        },
        null,
        2
      ),
    [currentPayload, selectedDoctor, selectedObraSocial]
  );

  const handleSubmit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();

      if (isSubmitting) return;

      const payload = buildRequestPayload(form, valorPrestacion);

      try {
        setIsSubmitting(true);
        await submitPayload(payload);
      } finally {
        setIsSubmitting(false);
      }
    },
    [form, isSubmitting, valorPrestacion]
  );

  return (
    <div className={styles.container}>
      <div className={styles.pageShell}>
        <header className={styles.header}>
          <h1 className={styles.title}>Carga de Facturación</h1>

          <div className={styles.statsGrid}>
            <div className={styles.statCard}>
              <span className={styles.statLabel}>Obra social</span>
              <strong className={styles.statValue}>
                {selectedObraSocial ? selectedObraSocial.NOMBRE : "Pendiente"}
              </strong>
            </div>

            <div className={styles.statCard}>
              <span className={styles.statLabel}>Doctor</span>
              <strong className={styles.statValue}>
                {selectedDoctor ? selectedDoctor.nombre : "Pendiente"}
              </strong>
            </div>

            <div className={styles.statCard}>
              <span className={styles.statLabel}>Valor total</span>
              <strong className={styles.statValue}>
                ${formatCurrency(valorPrestacion)}
              </strong>
            </div>
          </div>
        </header>

        <div className={styles.stickyActions}>
          <button
            type="button"
            className={styles.previewButton}
            onClick={handleOpenPreview}
          >
            <Eye size={18} />
            <span>Visualizar orden</span>
          </button>
        </div>

        <form className={styles.formCard} onSubmit={handleSubmit} noValidate>
          <div className={styles.sectionsStack}>
            <section className={styles.sectionCard}>
              <div className={styles.sectionHeader}>
                <div className={styles.sectionIcon}>
                  <WalletCards size={18} />
                </div>

                <div className={styles.sectionHeaderContent}>
                  <h2 className={styles.sectionTitle}>Datos de la prestación</h2>
                </div>
              </div>

              <div className={styles.fieldStack}>
                <SearchableSelect
                  inputId="obraSocial"
                  label="Obra social"
                  placeholder="Seleccioná una obra social"
                  searchPlaceholder="Buscar por nombre, código o número…"
                  emptyMessage={
                    obraSocialQuery.trim()
                      ? `Sin resultados para "${obraSocialQuery}"`
                      : "No hay obras sociales disponibles"
                  }
                  loadingMessage="Cargando obras sociales…"
                  disabled={loadingObras}
                  loading={loadingObras}
                  error={errorObras}
                  isOpen={obraSocialOpen}
                  setIsOpen={setObraSocialOpen}
                  query={obraSocialQuery}
                  onQueryChange={setObraSocialQuery}
                  options={filteredObraSocialOptions}
                  selected={selectedObraSocialOption}
                  onSelect={handleSelectObraSocial}
                  onClear={handleClearObraSocial}
                  resultsText={obraSocialResultsText}
                />

                <SearchableSelect
                  inputId="doctor"
                  label="Doctor"
                  placeholder={
                    selectedObraSocial
                      ? "Seleccioná un doctor"
                      : "Primero elegí una obra social"
                  }
                  searchPlaceholder="Buscar por nombre, socio, matrícula o especialidad…"
                  emptyMessage={
                    !selectedObraSocial
                      ? "Seleccioná primero una obra social"
                      : doctorQuery.trim()
                      ? `Sin resultados para "${doctorQuery}"`
                      : "No hay médicos cargados para esta obra social"
                  }
                  loadingMessage="Cargando médicos…"
                  helperText={
                    selectedObraSocial
                      ? "La lista se obtiene según la obra social seleccionada"
                      : "Este campo se habilita solo cuando elegís una obra social"
                  }
                  disabled={!selectedObraSocial || loadingDoctors}
                  loading={loadingDoctors}
                  error={errorDoctors}
                  isOpen={doctorOpen}
                  setIsOpen={setDoctorOpen}
                  query={doctorQuery}
                  onQueryChange={setDoctorQuery}
                  options={filteredDoctorOptions}
                  selected={selectedDoctorOption}
                  onSelect={handleSelectDoctor}
                  onClear={handleClearDoctor}
                  resultsText={doctorResultsText}
                />

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
                    placeholder="Código de la prestación"
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

                <div className={styles.summaryCard}>
                  <div className={styles.summaryTop}>
                    <div className={styles.summaryIcon}>
                      <DollarSign size={18} />
                    </div>

                    <div>
                      <div className={styles.summaryLabel}>Valor prestación</div>
                      <div className={styles.summaryValue}>
                        ${formatCurrency(valorPrestacion)}
                      </div>
                    </div>
                  </div>

                  <p className={styles.summaryHint}>
                    El valor se calcula automáticamente con honorarios, gastos,
                    coseguro y cantidad.
                  </p>
                </div>
              </div>
            </section>

            <section className={styles.sectionCard}>
              <div className={styles.sectionHeader}>
                <div className={styles.sectionIcon}>
                  <CalendarDays size={18} />
                </div>

                <div className={styles.sectionHeaderContent}>
                  <h2 className={styles.sectionTitle}>Datos del afiliado</h2>
                </div>
              </div>

              <div className={styles.fieldStack}>
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

                <div className={styles.formGroup}>
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
          </div>

          <div className={styles.actionsBar}>
            <p className={styles.actionsHint}>
              Los campos obra social, doctor, código, afiliado y fecha son
              necesarios para continuar.
            </p>

            <Button
              size="large"
              variant="primary"
              type="submit"
              disabled={isSubmitDisabled}
            >
              {isSubmitting ? "Procesando..." : "Cargar prestaciones"}
            </Button>
          </div>
        </form>

        <PreviewModal
          open={previewOpen}
          onClose={handleClosePreview}
          sections={previewSections}
          rawJson={previewJson}
        />
      </div>
    </div>
  );
};

export default CargaFacturacion;