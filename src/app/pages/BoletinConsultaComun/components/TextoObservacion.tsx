import s from "./TextoObservacion.module.scss";

type Renglon =
  | { tipo: "rotulo"; rotulo: string; cuerpo: string }
  | { tipo: "texto"; cuerpo: string };

/** Parte la observación en renglones; los que empiezan con un rótulo en mayúsculas («BONO: …») se marcan aparte. */
function partir(crudo: string): Renglon[] {
  const limpio = crudo
    .replace(/^[\s)?(|\\[\]{}]+/, "")
    .replace(/[\s)?(|\\[\]{}]+$/, "")
    .trim();
  if (!limpio) return [];

  return limpio
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .map((linea): Renglon => {
      const dosPuntos = linea.indexOf(":");
      if (dosPuntos > 2 && dosPuntos < linea.length - 1) {
        const antes = linea.slice(0, dosPuntos).trim();
        const letras = (antes.match(/[a-záéíóúüñA-ZÁÉÍÓÚÜÑ]/g) ?? []).length;
        const mayusculas = (antes.match(/[A-ZÁÉÍÓÚÜÑ]/g) ?? []).length;
        if (letras > 0 && mayusculas / letras >= 0.55 && antes.length >= 3) {
          return { tipo: "rotulo", rotulo: antes, cuerpo: linea.slice(dosPuntos + 1).trim() };
        }
      }
      return { tipo: "texto", cuerpo: linea };
    });
}

/** La observación tal como la lee el médico, un renglón por línea. */
export default function TextoObservacion({ texto }: { texto: string }) {
  return (
    <div className={s.obsTexto}>
      {partir(texto).map((r, i) =>
        r.tipo === "rotulo" ? (
          <p key={i} className={s.obsRenglon}>
            <span className={s.obsRotulo}>{r.rotulo}</span> {r.cuerpo}
          </p>
        ) : (
          <p key={i} className={s.obsRenglon}>
            {r.cuerpo}
          </p>
        )
      )}
    </div>
  );
}
