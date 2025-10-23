"use client";

import type React from "react";
import { useMemo, useRef, useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Award as IdCard,
  Check,
  ChevronDown,
  X as ClearIcon,
} from "lucide-react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import styles from "./IoscorAffilliateForm.module.scss";
import Button from "../../atoms/Button/Button";

export type PracticeInput = {
  dni: string;
  orderMode: "Auto" | "Manual";
  orderNumber?: string;
  cantidad: number;
  sesiones: number;
  fecha: string;
  codigo: string;
  obraSocCode: string;
  obraSocName: string;
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
  fecha: string;
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

const FAKE_CODES: Record<string, string> = {
  "420101": "CONSULTA COMÚN",
  "331001": "RADIOGRAFÍA",
  "550010": "CURACIÓN SIMPLE",
  "999999": "OTRA PRÁCTICA",
};

const OBRA_SOC = [
  { code: "304", name: "IOScor" },
  { code: "306", name: "IOScor (Plan Beta)" },
  { code: "307", name: "IOScor (Plan Materno Inf.)" },
  { code: "309", name: "IOScor (Anatomía Patológica)" },
  { code: "292", name: "IOScor (Urología)" },
  { code: "305", name: "IOScor (Interior)" },
  { code: "312", name: "IOScor (Complementaria)" },
  { code: "315", name: "IOScor (Traumatología)" },
  { code: "316", name: "IOScor (Hemoterapia)" },
  { code: "75", name: "IOScor (Alta Complejidad)" },
  { code: "328", name: "IOSCOR (CLINICA DEL IBERA )" },
  { code: "319", name: "IOSCOR (PRAC. INTERNADOS)" },
  { code: "337", name: "IOSCOR (C.del NINO)" },
  { code: "338", name: "IOSCOR (CARDIOCENTRO)" },
];

const onlyDigits = (v: string) => v.replace(/\D/g, "");

export default function IoscorAffilliateForm({
  onCreate,
  onUpdate,
  editingRow,
  onCancelEdit,
  loading,
}: Props) {
  const id = {
    dni: "dni",
    fecha: "fecha",
    socio: "socio",
    codigo: "codigo",
    cant: "cant",
    ses: "ses",
    ordenModo: "orden_modo",
    ordenNum: "orden_num",
    obra: "obra",
    ultimo: "ultimo",
    markHonor: "mark_hon",
    markGasto: "mark_gas",
    markAyud: "mark_ayu",
    percHon: "perc_hon",
    percGas: "perc_gas",
    percAyu: "perc_ayu",
  };

  const [dni, setDni] = useState("");
  const [socio, setSocio] = useState("");

  const [orderMode, setOrderMode] = useState<"Auto" | "Manual">("Manual");
  const [orderNumber, setOrderNumber] = useState("");

  const [cantidad, setCantidad] = useState<number>(1);
  const [sesiones, setSesiones] = useState<number>(1);

  const [fechaObj, setFechaObj] = useState<Date>(new Date());
  const fechaISO = useMemo(
    () =>
      new Date(fechaObj.getTime() - fechaObj.getTimezoneOffset() * 60000)
        .toISOString()
        .slice(0, 10),
    [fechaObj]
  );

  const [codigoInput, setCodigoInput] = useState("");
  const [codigoValue, setCodigoValue] = useState("");
  const [codeOpen, setCodeOpen] = useState(false);
  const codeBoxRef = useRef<HTMLDivElement | null>(null);

  const codeMatches = useMemo(() => {
    const q = codigoInput.toLowerCase().trim();
    if (!q) return Object.entries(FAKE_CODES);
    return Object.entries(FAKE_CODES).filter(
      ([c, n]) => c.includes(q) || n.toLowerCase().includes(q)
    );
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

  const [obraSocCode, setObraSocCode] = useState("304");
  const obraSocName = useMemo(
    () => OBRA_SOC.find((o) => o.code === obraSocCode)?.name ?? "IOScor",
    [obraSocCode]
  );

  const [ultimoNumero, setUltimoNumero] = useState("");

  const [markHonorario, setMarkHonorario] = useState(true);
  const [markGasto, setMarkGasto] = useState(false);
  const [markAyudante, setMarkAyudante] = useState(false);
  const [percHonorario, setPercHonorario] = useState(100);
  const [percGasto, setPercGasto] = useState(100);
  const [percAyudante, setPercAyudante] = useState(100);

  useEffect(() => {
    if (!editingRow) return;
    setDni(editingRow.dni);
    setOrderMode(editingRow.orderMode);
    setOrderNumber(editingRow.orderNumber ?? "");
    setCantidad(editingRow.cantidad);
    setSesiones(1);
    setFechaObj(new Date(editingRow.fecha));
    setCodigoValue(editingRow.codigo);
    setCodigoInput(
      FAKE_CODES[editingRow.codigo]
        ? `${editingRow.codigo} / ${FAKE_CODES[editingRow.codigo]}`
        : editingRow.codigo
    );
    setObraSocCode(editingRow.obraSocCode);
    setUltimoNumero("");
    setMarkHonorario((editingRow.percHonorario ?? 0) > 0);
    setMarkGasto((editingRow.percGasto ?? 0) > 0);
    setMarkAyudante((editingRow.percAyudante ?? 0) > 0);
    setPercHonorario(editingRow.percHonorario ?? 100);
    setPercGasto(editingRow.percGasto ?? 100);
    setPercAyudante(editingRow.percAyudante ?? 100);
  }, [editingRow]);

  const canSubmit = useMemo(() => {
    const dniOk = onlyDigits(dni).length >= 7;
    const cantOk = cantidad > 0;
    const sesOk = sesiones > 0;
    const codOk = !!codigoValue;
    const obraOk = !!obraSocCode;
    return dniOk && cantOk && sesOk && codOk && obraOk && !loading;
  }, [dni, cantidad, sesiones, codigoValue, obraSocCode, loading]);

  const toPayload = (): PracticeInput => ({
    dni: onlyDigits(dni),
    orderMode,
    orderNumber: orderMode === "Manual" ? orderNumber.trim() : undefined,
    cantidad,
    sesiones,
    fecha: fechaISO,
    codigo: codigoValue,
    obraSocCode,
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
    if (editingRow) onUpdate(editingRow.id, payload);
    else {
      onCreate(payload);
      setDni("");
      setSocio("");
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
    <div className={styles.wrapper}>
      <motion.form
        onSubmit={submit}
        className={styles.panel}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
      >
        <div className={styles.panelHead}>
          <div className={styles.headIcon}>
            <IdCard size={18} />
          </div>
          <div className={styles.headTitle}>
            Ingresar Nueva Practica - <b>Periodo Actual</b>
          </div>
        </div>

        <div className={styles.formGrid}>
          <label className={styles.labelCell} htmlFor={id.dni}>
            N° Documento
          </label>
          <div className={styles.fieldCell}>
            <input
              id={id.dni}
              className={styles.input}
              value={dni}
              onChange={(e) => setDni(e.target.value)}
              inputMode="numeric"
              placeholder="N° Documento"
            />
          </div>

          <label className={styles.labelCell} htmlFor={id.fecha}>
            Fecha
          </label>
          <div className={styles.fieldCell}>
            <div className={styles.dateWrap}>
              <DatePicker
                id={id.fecha}
                selected={fechaObj}
                onChange={(d) => d && setFechaObj(d)}
                dateFormat="dd/MM/yyyy"
                className={`${styles.input} ${styles.dateInput}`}
                popperClassName={styles.datePopper}
                placeholderText="Fecha"
              />
            </div>
          </div>

          <label className={styles.labelCell} htmlFor={id.socio}>
            N° Socio
          </label>
          <div className={styles.fieldCell}>
            <div className={styles.combo}>
              <input
                id={id.socio}
                className={`${styles.input} ${styles.comboInput}`}
                value={socio}
                onChange={(e) => setSocio(e.target.value)}
                placeholder="Buscar socio"
              />
              {!!socio && (
                <button
                  type="button"
                  className={styles.comboClear}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => setSocio("")}
                  title="Limpiar"
                  aria-label="Limpiar socio"
                >
                  <ClearIcon size={14} />
                </button>
              )}
            </div>
          </div>

          <label className={styles.labelCell} htmlFor={id.codigo}>
            Codigo
          </label>
          <div className={styles.fieldCell}>
            <div className={styles.codeCluster}>
              <div className={styles.combo} ref={codeBoxRef}>
                <input
                  id={id.codigo}
                  className={`${styles.input} ${styles.comboInput}`}
                  value={codigoInput}
                  onChange={(e) => {
                    setCodigoInput(e.target.value);
                    setCodeOpen(true);
                    const dig = onlyDigits(e.target.value);
                    setCodigoValue(FAKE_CODES[dig] ? dig : "");
                  }}
                  onFocus={() => setCodeOpen(true)}
                  placeholder="Buscar codigo"
                />
                {!!codigoInput && (
                  <button
                    type="button"
                    className={styles.comboClear}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      setCodigoInput("");
                      setCodigoValue("");
                    }}
                    title="Limpiar"
                    aria-label="Limpiar código"
                  >
                    <ClearIcon size={14} />
                  </button>
                )}
                <div
                  className={`${styles.comboSuffix} ${
                    isCodigoOk ? styles.suffixOk : ""
                  }`}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    setCodeOpen((v) => !v);
                  }}
                  title={isCodigoOk ? "Código válido" : "Elegí un código"}
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

              <div className={styles.miniInputs}>
                <label htmlFor={id.cant} className={styles.miniLabel}>
                  Cant.
                </label>
                <input
                  id={id.cant}
                  className={`${styles.input} ${styles.inputSm}`}
                  type="number"
                  min={1}
                  value={cantidad}
                  onChange={(e) => setCantidad(Number(e.target.value))}
                />
                <label htmlFor={id.ses} className={styles.miniLabel}>
                  Ses.
                </label>
                <input
                  id={id.ses}
                  className={`${styles.input} ${styles.inputSm}`}
                  type="number"
                  min={1}
                  value={sesiones}
                  onChange={(e) => setSesiones(Number(e.target.value))}
                />
              </div>
            </div>
          </div>

          <label className={styles.labelCell} htmlFor={id.ordenNum}>
            N° Orden
          </label>
          <div className={styles.fieldCell}>
            <div className={styles.orderRow}>
              <select
                id={id.ordenModo}
                className={`${styles.input} ${styles.inputSelect}`}
                value={orderMode}
                onChange={(e) =>
                  setOrderMode(e.target.value as "Auto" | "Manual")
                }
              >
                <option>Manual</option>
                <option>Auto</option>
              </select>
              <input
                id={id.ordenNum}
                className={styles.input}
                disabled={orderMode !== "Manual"}
                value={orderNumber}
                onChange={(e) => setOrderNumber(e.target.value)}
                placeholder="Ingresar n° orden"
              />
            </div>
          </div>

          <label className={styles.labelCell} htmlFor={id.obra}>
            Ob. Soc
          </label>
          <div className={styles.fieldCell}>
            <select
              id={id.obra}
              className={`${styles.input} ${styles.select}`}
              value={obraSocCode}
              onChange={(e) => setObraSocCode(e.target.value)}
            >
              {OBRA_SOC.map((o) => (
                <option
                  key={o.code}
                  value={o.code}
                >{`${o.code} - ${o.name}`}</option>
              ))}
            </select>
          </div>

          <span className={styles.labelCell}>Ult. n° guardado</span>
          <div className={styles.fieldCell}>
            <input
              id={id.ultimo}
              className={styles.input}
              value={ultimoNumero}
              onChange={(e) => setUltimoNumero(e.target.value)}
              placeholder="N° orden"
              disabled
            />
          </div>

          <span className={styles.labelCell}>%</span>
          <div className={styles.fieldCell}>
            <div className={styles.percentRow}>
              <input
                id={id.percHon}
                className={`${styles.input} ${styles.inputSm}`}
                type="number"
                min={0}
                max={100}
                step={1}
                disabled={!markHonorario}
                value={percHonorario}
                onChange={(e) => setPercHonorario(Number(e.target.value))}
              />
              <input
                id={id.percGas}
                className={`${styles.input} ${styles.inputSm}`}
                type="number"
                min={0}
                max={100}
                step={1}
                disabled={!markGasto}
                value={percGasto}
                onChange={(e) => setPercGasto(Number(e.target.value))}
              />
              <input
                id={id.percAyu}
                className={`${styles.input} ${styles.inputSm}`}
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

          <span className={styles.labelCell}>Marcar</span>
          <div className={styles.fieldCell}>
            <div className={styles.markGrid}>
              <label className={styles.checkRow} htmlFor={id.markHonor}>
                <input
                  id={id.markHonor}
                  type="checkbox"
                  checked={markHonorario}
                  onChange={(e) => setMarkHonorario(e.target.checked)}
                />
                <span>Honorario</span>
              </label>
              <label className={styles.checkRow} htmlFor={id.markGasto}>
                <input
                  id={id.markGasto}
                  type="checkbox"
                  checked={markGasto}
                  onChange={(e) => setMarkGasto(e.target.checked)}
                />
                <span>Gasto</span>
              </label>
              <label className={styles.checkRow} htmlFor={id.markAyud}>
                <input
                  id={id.markAyud}
                  type="checkbox"
                  checked={markAyudante}
                  onChange={(e) => setMarkAyudante(e.target.checked)}
                />
                <span>Ayudante</span>
              </label>
            </div>
          </div>

          <div className={styles.emptyCell} />
          <div className={styles.emptyCell} />
        </div>

        <div className={styles.actions}>
          {editingRow && (
            <Button
              variant="secondary"
              size="md"
              onClick={onCancelEdit}
              type="button"
            >
              Cancelar
            </Button>
          )}
          <button className={styles.btnSave} disabled={!canSubmit}>
            {loading
              ? "Guardando..."
              : editingRow
              ? "Actualizar Práctica"
              : "Guardar"}
          </button>
        </div>
      </motion.form>
    </div>
  );
}

// POST /api/ioscor/practicas  Content-Type: application/json  Body: PracticeInput
