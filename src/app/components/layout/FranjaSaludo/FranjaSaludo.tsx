import s from "./FranjaSaludo.module.scss";

/** El banner de los inicios del panel: la fecha y el saludo, de borde a borde. */
export default function FranjaSaludo({ fecha, saludo }: { fecha: string; saludo: string }) {
  return (
    <header className={s.hero}>
      <p className={s.fecha}>{fecha}</p>
      <h1 className={s.saludo}>{saludo}</h1>
    </header>
  );
}
