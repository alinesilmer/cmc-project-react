import DatePicker from "react-datepicker";
import styles from "../DoctorProfilePage.module.scss";
import type { DoctorProfileX } from "./legajo.types";
import { parseLocalDate, toYmd } from "./legajo.helpers";

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

  return { RText, RNumber, RSexo, RCondicion_impositiva, RDate };
}

export type CamposEdicion = ReturnType<typeof camposEdicion>;
