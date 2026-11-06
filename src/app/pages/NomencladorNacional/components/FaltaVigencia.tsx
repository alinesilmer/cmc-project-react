import s from "./FaltaVigencia.module.scss";

/** El texto con que se avisa que falta la vigencia; los formularios que validan al guardar usan el mismo. */
export const MENSAJE_FALTA_VIGENCIA = "Indicá la vigencia";

/** Aviso bajo un campo de vigencia: se muestra sólo mientras el campo está vacío, que es como arranca. */
export default function FaltaVigencia({ vigencia }: { vigencia: string }) {
  if (vigencia) return null;
  return (
    <p className={s.falta} role="status">
      {MENSAJE_FALTA_VIGENCIA}
    </p>
  );
}
