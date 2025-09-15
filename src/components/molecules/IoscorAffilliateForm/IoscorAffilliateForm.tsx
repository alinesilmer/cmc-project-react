"use client";

import { useMemo, useRef, useState, useEffect } from "react";
import { motion } from "framer-motion";
import { IdCard, Check, ChevronDown } from "lucide-react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import styles from "./IoscorAffilliateForm.module.scss";
import Button from "../../atoms/Button/Button";

/* ---------------- Types ---------------- */
export type PracticeInput = {
  dni: string;
  orderMode: "Auto" | "Manual";
  orderNumber?: string;
  cantidad: number;
  sesiones: number;
  fecha: string; // ISO yyyy-mm-dd
  codigo: string; // e.g. 420101
  obraSocCode: string; // e.g. 304
  obraSocName: string; // e.g. IOSCOR
  ultimoNumero?: string;
  markHonorario: boolean;
  markGasto: boolean;
  markAyudante: boolean;
  percHonorario: number;
  percGasto: number;
  percAyudante: number;
};

export type PracticeRowForEdit = {
  id: string;
  dni: string;
  isIoscor: boolean;
  obraSocCode: string;
  obraSocName: string;
  codigo: string;
  cantidad: number;
  fecha: string; // ISO
  orderMode: "Auto" | "Manual";
  orderNumber?: string;
  percHonorario?: number;
  percGasto?: number;
  percAyudante?: number;
};

type Props = {
  onCreate: (payload: PracticeInput) => void;
  onUpdate: (id: string, payload: PracticeInput) => void;
  editingRow: PracticeRowForEdit | null;
  onCancelEdit?: () => void;
  loading?: boolean;
};

/* ---------------- Mock data for local comboboxes ---------------- */
const FAKE_CODES: Record<string, string> = {
  "420101": "CONSULTA COMÚN",
  "331001": "RADIOGRAFÍA",
  "550010": "CURACIÓN SIMPLE",
  "999999": "OTRA PRÁCTICA",
};

const OBRA_SOC = [
  { code: "304", name: "IOSCOR" },
  { code: "101", name: "OSDE" },
  { code: "221", name: "Swiss Medical" },
  { code: "401", name: "Galeno" },
];

const onlyDigits = (v: string) => v.replace(/\D/g, "");

/* ================================================================== */
export default function IoscorAffilliateForm({
  onCreate,
  onUpdate,
  editingRow,
  onCancelEdit,
  loading,
}: Props) {
  /* ----- state (will be hydrated when editingRow changes) ----- */
  const [dni, setDni] = useState("");
  const [orderMode, setOrderMode] = useState<"Auto" | "Manual">("Auto");
  const [orderNumber, setOrderNumber] = useState("");
  const [cantidad, setCantidad] = useState<number>(1);
  const [sesiones, setSesiones] = useState<number>(1);

  // Fecha (react-datepicker)
  const [fechaObj, setFechaObj] = useState<Date>(new Date());
  const fechaISO = useMemo(
    () =>
      new Date(fechaObj.getTime() - fechaObj.getTimezoneOffset() * 60000)
        .toISOString()
        .slice(0, 10),
    [fechaObj]
  );

  // CÓDIGO as single-input combobox
  const [codigoInput, setCodigoInput] = useState("420101 / CONSULTA COMÚN");
  const [codigoValue, setCodigoValue] = useState("420101");
  const [codeOpen, setCodeOpen] = useState(false);
  const codeBoxRef = useRef<HTMLDivElement | null>(null);

  const codeMatches = useMemo(() => {
    const q = codigoInput.toLowerCase().trim();
    if (!q) return Object.entries(FAKE_CODES).slice(0, 8);
    return Object.entries(FAKE_CODES)
      .filter(
        ([code, name]) => code.includes(q) || name.toLowerCase().includes(q)
      )
      .slice(0, 8);
  }, [codigoInput]);

  const isCodigoOk = useMemo(() => !!FAKE_CODES[codigoValue], [codigoValue]);

  const handleCodePick = (code: string, label: string) => {
    setCodigoValue(code);
    setCodigoInput(`${code} / ${label}`);
    setCodeOpen(false);
  };

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (!codeBoxRef.current) return;
      if (!codeBoxRef.current.contains(e.target as Node)) setCodeOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  // OBRA SOCIAL: single-input combobox (write or pick)
  const [obraInput, setObraInput] = useState("304 - IOSCOR");
  const [obraSocCode, setObraSocCode] = useState("304");
  const [obraOpen, setObraOpen] = useState(false);
  const obraBoxRef = useRef<HTMLDivElement | null>(null);

  const obraSocName =
    OBRA_SOC.find((o) => o.code === obraSocCode)?.name ??
    (obraInput.includes("-")
      ? obraInput.split("-").slice(1).join("-").trim()
      : "Personalizada");

  const obraMatches = useMemo(() => {
    const q = obraInput.toLowerCase().trim();
    if (!q) return OBRA_SOC.slice(0, 8);
    return OBRA_SOC.filter(
      (o) =>
        o.code.includes(q) ||
        `${o.code} - ${o.name}`.toLowerCase().includes(q) ||
        o.name.toLowerCase().includes(q)
    ).slice(0, 8);
  }, [obraInput]);

  const handleObraPick = (code: string, label: string) => {
    setObraSocCode(code);
    setObraInput(`${code} - ${label}`);
    setObraOpen(false);
  };

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (!obraBoxRef.current) return;
      if (!obraBoxRef.current.contains(e.target as Node)) setObraOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const [ultimoNumero, setUltimoNumero] = useState("");

  // Marcar + %
  const [markHonorario, setMarkHonorario] = useState(true);
  const [markGasto, setMarkGasto] = useState(false);
  const [markAyudante, setMarkAyudante] = useState(false);
  const [percHonorario, setPercHonorario] = useState(100);
  const [percGasto, setPercGasto] = useState(100);
  const [percAyudante, setPercAyudante] = useState(100);

  /* ----- hydrate form when editingRow changes ----- */
  useEffect(() => {
    if (!editingRow) return;

    setDni(editingRow.dni);
    setOrderMode(editingRow.orderMode);
    setOrderNumber(editingRow.orderNumber ?? "");
    setCantidad(editingRow.cantidad);
    setSesiones(1); // not in row -> keep 1 or adapt if you store it
    setFechaObj(new Date(editingRow.fecha));
    setCodigoValue(editingRow.codigo);
    setCodigoInput(
      FAKE_CODES[editingRow.codigo]
        ? `${editingRow.codigo} / ${FAKE_CODES[editingRow.codigo]}`
        : editingRow.codigo
    );

    setObraSocCode(editingRow.obraSocCode);
    setObraInput(`${editingRow.obraSocCode} - ${editingRow.obraSocName}`);

    setUltimoNumero("");
    setMarkHonorario((editingRow.percHonorario ?? 0) > 0);
    setMarkGasto((editingRow.percGasto ?? 0) > 0);
    setMarkAyudante((editingRow.percAyudante ?? 0) > 0);
    setPercHonorario(editingRow.percHonorario ?? 100);
    setPercGasto(editingRow.percGasto ?? 100);
    setPercAyudante(editingRow.percAyudante ?? 100);
  }, [editingRow]);

  /* ----- validations ----- */
  const canSubmit = useMemo(() => {
    const dniOk = onlyDigits(dni).length >= 7;
    const cantOk = cantidad > 0;
    const sesOk = sesiones > 0;
    const codOk = !!codigoValue;
    const obraOk = !!obraSocCode;
    return dniOk && cantOk && sesOk && codOk && obraOk && !loading;
  }, [dni, cantidad, sesiones, codigoValue, obraSocCode, loading]);

  /* ----- submit ----- */
  const toPayload = (): PracticeInput => ({
    dni: onlyDigits(dni),
    orderMode,
    orderNumber: orderMode === "Manual" ? orderNumber.trim() : undefined,
    cantidad,
    sesiones,
    fecha: fechaISO,
    codigo: codigoValue,
    obraSocCode: onlyDigits(obraSocCode),
    obraSocName,
    ultimoNumero: ultimoNumero.trim() || undefined,
    markHonorario,
    markGasto,
    markAyudante,
    percHonorario,
    percGasto,
    percAyudante,
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;

    const payload = toPayload();
    if (editingRow) {
      onUpdate(editingRow.id, payload);
    } else {
      onCreate(payload);
      // soft reset (keep some defaults)
      setDni("");
      setOrderNumber("");
      setCantidad(1);
      setSesiones(1);
      setCodigoInput("");
      setCodigoValue("");
      setUltimoNumero("");
      setMarkHonorario(true);
      setMarkGasto(false);
      setMarkAyudante(false);
      setPercHonorario(100);
      setPercGasto(100);
      setPercAyudante(100);
    }
  };

  return (
    <motion.form
      onSubmit={submit}
      className={styles.panel}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
    >
      <div className={styles.panelHead}>
        <div className={styles.headIcon}>
          <IdCard size={16} />
        </div>
        <div className={styles.headTitle}>
          {editingRow ? "Editar Práctica" : "Ingresar Nueva Práctica"}
        </div>
      </div>

      <div className={styles.panelBody}>
        <div className={styles.grid}>
          {/* LEFT */}
          <div className={styles.col}>
            <label className={styles.field}>
              <span className={styles.label}>N° Doc.</span>
              <input
                className={styles.input}
                value={dni}
                onChange={(e) => setDni(e.target.value)}
                inputMode="numeric"
                placeholder="77.153.526"
              />
            </label>

            <div className={styles.fieldRow}>
              <label className={`${styles.field} ${styles.shrink}`}>
                <span className={styles.label}>N° Orden</span>
                <select
                  className={styles.input}
                  value={orderMode}
                  onChange={(e) =>
                    setOrderMode(e.target.value as "Auto" | "Manual")
                  }
                >
                  <option>Auto</option>
                  <option>Manual</option>
                </select>
              </label>

              <label className={styles.field}>
                <span className={styles.label}>Ingresar n° orden</span>
                <input
                  className={styles.input}
                  disabled={orderMode !== "Manual"}
                  value={orderNumber}
                  onChange={(e) => setOrderNumber(e.target.value)}
                  placeholder="000123"
                />
              </label>
            </div>

            <div className={styles.fieldRow}>
              <label className={`${styles.field} ${styles.shrink}`}>
                <span className={styles.label}>Cant.</span>
                <input
                  className={styles.input}
                  type="number"
                  min={1}
                  value={cantidad}
                  onChange={(e) => setCantidad(Number(e.target.value))}
                />
              </label>

              <label className={`${styles.field} ${styles.shrink}`}>
                <span className={styles.label}>Ses.</span>
                <input
                  className={styles.input}
                  type="number"
                  min={1}
                  value={sesiones}
                  onChange={(e) => setSesiones(Number(e.target.value))}
                />
              </label>
            </div>

            {/* Marcar */}
            <div className={styles.markWrap}>
              <span className={styles.label}>Marcar</span>
              <div className={styles.markGrid}>
                <label className={styles.checkRow}>
                  <input
                    type="checkbox"
                    checked={markHonorario}
                    onChange={(e) => setMarkHonorario(e.target.checked)}
                  />
                  <span>Honorario</span>
                </label>
                <label className={styles.checkRow}>
                  <input
                    type="checkbox"
                    checked={markGasto}
                    onChange={(e) => setMarkGasto(e.target.checked)}
                  />
                  <span>Gasto</span>
                </label>
                <label className={styles.checkRow}>
                  <input
                    type="checkbox"
                    checked={markAyudante}
                    onChange={(e) => setMarkAyudante(e.target.checked)}
                  />
                  <span>Ayudante</span>
                </label>
              </div>

              <div className={styles.percentRow}>
                <span className={styles.percentLabel}>%</span>
                <input
                  className={styles.input}
                  type="number"
                  min={0}
                  max={100}
                  step={1}
                  disabled={!markHonorario}
                  value={percHonorario}
                  onChange={(e) => setPercHonorario(Number(e.target.value))}
                />
                <input
                  className={styles.input}
                  type="number"
                  min={0}
                  max={100}
                  step={1}
                  disabled={!markGasto}
                  value={percGasto}
                  onChange={(e) => setPercGasto(Number(e.target.value))}
                />
                <input
                  className={styles.input}
                  type="number"
                  min={0}
                  max={100}
                  step={1}
                  disabled={!markAyudante}
                  value={percAyudante}
                  onChange={(e) => setPercAyudante(Number(e.target.value))}
                />
              </div>
            </div>
          </div>

          {/* RIGHT */}
          <div className={styles.col}>
            {/* Fecha (DatePicker) */}
            <label className={styles.field}>
              <span className={styles.label}>Fecha</span>
              <div className={styles.dateWrap}>
                <DatePicker
                  selected={fechaObj}
                  onChange={(d) => d && setFechaObj(d)}
                  dateFormat="dd/MM/yyyy"
                  className={`${styles.input} ${styles.dateInput}`}
                  popperClassName={styles.datePopper}
                />
              </div>
            </label>

            {/* Código combobox */}
            <label className={styles.field}>
              <span className={styles.label}>Código</span>
              <div className={`${styles.combo}`} ref={codeBoxRef}>
                <input
                  className={`${styles.input} ${styles.comboInput}`}
                  value={codigoInput}
                  onChange={(e) => {
                    setCodigoInput(e.target.value);
                    setCodeOpen(true);
                    const dig = onlyDigits(e.target.value);
                    if (FAKE_CODES[dig]) setCodigoValue(dig);
                    else setCodigoValue("");
                  }}
                  onFocus={() => setCodeOpen(true)}
                  placeholder="420101 / CONSULTA COMÚN"
                />
                <div
                  className={`${styles.comboSuffix} ${
                    isCodigoOk ? styles.suffixOk : ""
                  }`}
                  title={isCodigoOk ? "Código válido" : "Elegí un código"}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    setCodeOpen((v) => !v);
                  }}
                >
                  {isCodigoOk ? <Check size={16} /> : <ChevronDown size={16} />}
                </div>

                {codeOpen && codeMatches.length > 0 && (
                  <ul className={styles.comboList}>
                    {codeMatches.map(([code, label]) => (
                      <li
                        key={code}
                        className={styles.comboItem}
                        onMouseDown={(e) => {
                          e.preventDefault();
                          handleCodePick(code, label);
                        }}
                      >
                        <span className={styles.itemCode}>{code}</span>
                        <span className={styles.itemLabel}>{label}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </label>

            {/* Ob. Soc combobox (single input) */}
            <label className={styles.field}>
              <span className={styles.label}>Ob. Soc</span>
              <div className={styles.combo} ref={obraBoxRef}>
                <input
                  className={`${styles.input} ${styles.comboInput}`}
                  value={obraInput}
                  onChange={(e) => {
                    const v = e.target.value;
                    setObraInput(v);
                    setObraOpen(true);
                    const dig = onlyDigits(v);
                    if (dig) setObraSocCode(dig);
                  }}
                  onFocus={() => setObraOpen(true)}
                  placeholder="304 - IOSCOR"
                />
                <div
                  className={styles.comboSuffix}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    setObraOpen((v) => !v);
                  }}
                >
                  <ChevronDown size={16} />
                </div>

                {obraOpen && obraMatches.length > 0 && (
                  <ul className={styles.comboList}>
                    {obraMatches.map((o) => (
                      <li
                        key={o.code}
                        className={styles.comboItem}
                        onMouseDown={(e) => {
                          e.preventDefault();
                          handleObraPick(o.code, o.name);
                        }}
                      >
                        <span className={styles.itemCode}>{o.code}</span>
                        <span className={styles.itemLabel}>{o.name}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </label>

            <label className={styles.field}>
              <span className={styles.label}>Ult. nº</span>
              <input
                className={styles.input}
                value={ultimoNumero}
                onChange={(e) => setUltimoNumero(e.target.value)}
                placeholder="715106"
              />
            </label>
          </div>
        </div>

        {/* actions */}
        <div className={styles.actions}>
          {editingRow && (
            <Button
              variant="primary"
              size="sm"
              className={styles.btnGhost}
              onClick={onCancelEdit}
            >
              Cancelar
            </Button>
          )}
          <button className={styles.btnSave} disabled={!canSubmit}>
            {loading ? "Guardando..." : editingRow ? "Actualizar" : "Guardar"}
          </button>
        </div>
      </div>
    </motion.form>
  );
}
