import DatePicker from "react-datepicker";
import styles from "../DoctorProfilePage.module.scss";
import type { DoctorProfileX } from "./legajo.types";
import { parseLocalDate, toYmd } from "./legajo.helpers";
import { errorCbu, MEDIOS_COBRO, type MedioCobro } from "@/app/shared/lib/cbu";

type Valor = DoctorProfileX[keyof DoctorProfileX];

type SetField = <K extends keyof DoctorProfileX>(key: K, val: DoctorProfileX[K]) => void;

/** Los inputs de la pestaña Datos cuando se edita; leen y escriben el borrador. */
export function camposEdicion(draft: Partial<DoctorProfileX>, setField: SetField) {
  const RText = (key: keyof DoctorProfileX, placeholder = "") => (
    <input
      className={styles.input}
      value={(draft[key] as string | number | null | undefined) ?? ""}
      onChange={(e) => setField(key, e.target.value as Valor)}
      placeholder={placeholder}
    />
  );

  const RNumber = (key: keyof DoctorProfileX) => (
    <input
      className={styles.input}
      value={(draft[key] as string | number | null | undefined) ?? ""}
      onChange={(e) =>
        setField(
          key,
          e.target.value === "" ? ("" as Valor) : (Number(e.target.value) as Valor)
        )
      }
      inputMode="numeric"
    />
  );

  const RSexo = (key: keyof DoctorProfileX = "sexo") => (
    <select
      className={styles.select}
      value={(draft[key] as string | number | null | undefined) ?? ""}
      onChange={(e) => setField(key, e.target.value as Valor)}
    >
      <option value="">—</option>
      <option value="M">Masculino</option>
      <option value="F">Femenino</option>
    </select>
  );

  const RCondicion_impositiva = (
    key: keyof DoctorProfileX = "condicion_impositiva"
  ) => (
    <select
      className={styles.select}
      value={(draft[key] as string | number | null | undefined) ?? ""}
      onChange={(e) => setField(key, e.target.value as Valor)}
    >
      <option value="">—</option>
      <option value="Monotributista">Monotributista</option>
      <option value="Responsable Inscripto">Responsable Inscripto</option>
      <option value="Exento">Exento</option>
      <option value="Rentas">Rentas</option>
    </select>
  );

  const RDate = (key: keyof DoctorProfileX) => {
    const curr = draft[key] as string | null | undefined;
    const asDate = curr ? parseLocalDate(curr) : null;
    return (
      <DatePicker
        selected={asDate}
        onChange={(d) => setField(key, toYmd(d) as Valor)}
        className={styles.dateInput}
        dateFormat="dd-MM-yyyy"
        placeholderText="dd-MM-aaaa"
        closeOnScroll
        showPopperArrow={false}
      />
    );
  };

  // setField está tipado por clave; para los campos de cobro alcanza con un setter sin tipo.
  const setAny = setField as unknown as (key: keyof DoctorProfileX, val: unknown) => void;

  /** CBU de Santander o de otro banco: solo dígitos, con el aviso de por qué no sirve si no es válido. */
  const RCbu = (key: "cbu_santander" | "cbu_otro_banco", banco: "santander" | "otro") => {
    const valor = (draft[key] as string | null | undefined) ?? "";
    const error = errorCbu(valor, banco);
    return (
      <>
        <input
          className={styles.input}
          value={valor}
          onChange={(e) => setAny(key, e.target.value.replace(/\D/g, ""))}
          inputMode="numeric"
          maxLength={22}
          placeholder="22 dígitos"
        />
        {error && <small className={styles.errorInline}>{error}</small>}
      </>
    );
  };

  /** Por dónde cobra: Santander, Otros bancos o Cheque (radios). */
  const RMedioCobro = () => (
    <>
    <div className={styles.radioGroup} role="radiogroup" aria-label="Cobra por">
      {MEDIOS_COBRO.map(({ value, label }) => (
        <label key={value} className={styles.radioOpcion}>
          <input
            type="radio"
            name="medio_cobro"
            value={value}
            checked={(draft.medio_cobro ?? "cheque") === value}
            onChange={() => setAny("medio_cobro", value satisfies MedioCobro)}
          />
          {label}
        </label>
      ))}
    </div>
    {(draft.medio_cobro ?? "cheque") === "cheque" && (
      <small className={styles.ayudaCobro}>Con cheque no hace falta cargar un CBU.</small>
    )}
    </>
  );

  return { RText, RNumber, RSexo, RCondicion_impositiva, RDate, RCbu, RMedioCobro };
}

export type CamposEdicion = ReturnType<typeof camposEdicion>;
