import type { ChangeEvent } from "react";
import { Loader2, Save } from "lucide-react";
import type { GalenoFormState, GalenoLevel } from "../boletinGalenos.types";
import { GALENO_FIELDS } from "../boletinGalenos.types";
import styles from "./GalenoForm.module.scss";

type ObraSocialItem = { id: string; nombre: string };

type Props = {
  form:          GalenoFormState;
  onChange:      (key: keyof GalenoFormState, value: string | GalenoLevel) => void;
  onSubmit:      () => void;
  submitting:    boolean;
  obrasSociales: ObraSocialItem[];
  osLoading:     boolean;
};

const LEVELS: { value: GalenoLevel; label: string }[] = [
  { value: 0,  label: "Base"    },
  { value: 7,  label: "Nivel 7" },
  { value: 10, label: "Nivel 10"},
];

function numericOnly(v: string) { return v.replace(/[^0-9.,]/g, ""); }

function MoneyRow({
  id, label, value, onChange,
}: { id: string; label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className={styles.row}>
      <label className={styles.rowLabel} htmlFor={id}>{label}</label>
      <div className={styles.moneyWrap}>
        <span className={styles.prefix}>$</span>
        <input
          id={id}
          className={styles.moneyInput}
          inputMode="decimal"
          placeholder="0"
          value={value}
          onChange={(e: ChangeEvent<HTMLInputElement>) => onChange(numericOnly(e.target.value))}
          autoComplete="off"
        />
      </div>
    </div>
  );
}

export default function GalenoForm({
  form, onChange, onSubmit, submitting, obrasSociales, osLoading,
}: Props) {
  const isValid = form.nro_obra_social !== "" && form.fecha_vigencia !== "";

  const galenoFields = GALENO_FIELDS.filter((f) => f.group === "galenos");
  const gastosFields  = GALENO_FIELDS.filter((f) => f.group === "gastos");

  return (
    <form
      className={styles.form}
      onSubmit={(e) => { e.preventDefault(); if (isValid) onSubmit(); }}
      noValidate
    >
      {/* ── Obra social ── */}
      <div className={styles.topField}>
        <label className={styles.topLabel} htmlFor="os-select">Obra Social</label>
        {osLoading ? (
          <div className={styles.skeleton}><Loader2 size={14} className={styles.spin} /> Cargando…</div>
        ) : (
          <select
            id="os-select"
            className={styles.select}
            value={form.nro_obra_social}
            onChange={(e) => onChange("nro_obra_social", e.target.value)}
            required
          >
            <option value="">Seleccionar…</option>
            {obrasSociales.map((os) => (
              <option key={os.id} value={os.id}>{os.nombre}</option>
            ))}
          </select>
        )}
      </div>

      {/* ── Fecha + Nivel ── */}
      <div className={styles.metaRow}>
        <div className={styles.topField}>
          <label className={styles.topLabel} htmlFor="fecha-vigencia">Vigencia desde</label>
          <input
            id="fecha-vigencia"
            type="date"
            className={styles.dateInput}
            value={form.fecha_vigencia}
            onChange={(e) => onChange("fecha_vigencia", e.target.value)}
            required
          />
        </div>

        <div className={styles.topField}>
          <span className={styles.topLabel}>Nivel</span>
          <div className={styles.segmented}>
            {LEVELS.map((lvl) => (
              <button
                key={lvl.value}
                type="button"
                className={`${styles.segment} ${form.nivel === lvl.value ? styles.segmentActive : ""}`}
                onClick={() => onChange("nivel", lvl.value)}
              >
                {lvl.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className={styles.divider} />

      {/* ── Galenos ── */}
      <div className={styles.groupLabel}>Galenos</div>
      <div className={styles.group}>
        {galenoFields.map((f) => (
          <MoneyRow
            key={f.key}
            id={f.key}
            label={f.label}
            value={form[f.key]}
            onChange={(v) => onChange(f.key, v)}
          />
        ))}
      </div>

      <div className={styles.divider} />

      {/* ── Gastos ── */}
      <div className={styles.groupLabel}>Gastos</div>
      <div className={styles.group}>
        {gastosFields.map((f) => (
          <MoneyRow
            key={f.key}
            id={f.key}
            label={f.label}
            value={form[f.key]}
            onChange={(v) => onChange(f.key, v)}
          />
        ))}
      </div>

      {/* ── Submit ── */}
      <button
        type="submit"
        className={styles.submitBtn}
        disabled={!isValid || submitting}
      >
        {submitting ? <Loader2 size={15} className={styles.spin} /> : <Save size={15} />}
        {submitting ? "Guardando…" : "Guardar Boletín"}
      </button>
    </form>
  );
}
