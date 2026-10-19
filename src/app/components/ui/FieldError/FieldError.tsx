import s from "./FieldError.module.scss";

/** El mensaje de error debajo de un campo; sin mensaje no dibuja nada. */
export default function FieldError({ msg }: { msg?: string }) {
  if (!msg) return null;
  return (
    <span className={s.error} role="alert">
      {msg}
    </span>
  );
}
