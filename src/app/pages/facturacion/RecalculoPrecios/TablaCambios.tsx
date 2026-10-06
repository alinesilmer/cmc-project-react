import { memo } from "react";

import type { RecalculoFila, RecalculoOmitida } from "../types";
import { formatMoney, parseMoney } from "../money";
import styles from "./RecalculoPrecios.module.scss";

/**
 * Tabla de las prestaciones que cambian y lista de las que no se tocan.
 *
 * Se dibujan TODAS (Sancor trae casi mil): así Ctrl+F encuentra cualquiera. Para
 * que no se trabe, las filas van en bloques de `POR_BLOQUE`, cada uno su propia
 * `<table>` con el mismo `colgroup` y `table-layout: fixed` (columnas alineadas), y
 * los bloques llevan `content-visibility: auto`: el navegador no calcula ni pinta
 * los que están fuera de pantalla. Misma técnica que la lista de prestaciones de la
 * factura (`FacturaDetalle/GrupoTabla.tsx`).
 */

const POR_BLOQUE = 50;

const fechaCorta = (iso: string | null) => (iso ? iso.split("-").reverse().join("/") : "—");

function enBloques<T>(lista: T[]): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < lista.length; i += POR_BLOQUE) out.push(lista.slice(i, i + POR_BLOQUE));
  return out;
}

/** "antes → después" sólo cuando cambió. */
function Cambio({ antes, despues }: { antes: string; despues: string }) {
  if (parseMoney(antes) === parseMoney(despues)) return <>{formatMoney(despues)}</>;
  return (
    <>
      <span className={styles.antes}>{formatMoney(antes)}</span> → {formatMoney(despues)}
    </>
  );
}

const Columnas = () => (
  <colgroup>
    <col style={{ width: "9%" }} />
    <col style={{ width: "7%" }} />
    <col style={{ width: "7%" }} />
    <col style={{ width: "8%" }} />
    <col style={{ width: "12%" }} />
    <col style={{ width: "12%" }} />
    <col style={{ width: "10%" }} />
    <col style={{ width: "10%" }} />
    <col style={{ width: "14%" }} />
    <col style={{ width: "11%" }} />
  </colgroup>
);

function Fila({ f }: { f: RecalculoFila }) {
  const d = parseMoney(f.diferencia);
  return (
    <tr className={f.grupo_equipo_id ? styles.equipo : undefined}>
      <td>
        {f.id}
        {f.publicado ? <span className={styles.publicada} title="El médico ya vio el importe anterior">publicada</span> : null}
      </td>
      <td>{f.cod_medico}</td>
      <td>{f.cod_nomenclador}</td>
      <td>{fechaCorta(f.fecha_cotizacion)}</td>
      <td className={styles.num}><Cambio antes={f.honorarios_antes} despues={f.honorarios} /></td>
      <td className={styles.num}><Cambio antes={f.gastos_antes} despues={f.gastos} /></td>
      <td className={styles.num}><Cambio antes={f.ayudante_antes} despues={f.ayudante} /></td>
      <td className={styles.num}><Cambio antes={f.coseguro_antes} despues={f.coseguro} /></td>
      <td className={styles.num}><Cambio antes={f.importe_antes} despues={f.importe_despues} /></td>
      <td className={`${styles.num} ${d < 0 ? styles.baja : styles.sube}`}>
        {d > 0 ? "+" : ""}{formatMoney(f.diferencia)}
      </td>
    </tr>
  );
}

export const TablaCambios = memo(function TablaCambios({ filas }: { filas: RecalculoFila[] }) {
  return (
    <div className={styles.tablaWrap}>
      <table className={`${styles.tabla} ${styles.cabecera}`}>
        <Columnas />
        <thead>
          <tr>
            <th>Id</th>
            <th>Socio</th>
            <th>Código</th>
            <th>Fecha usada</th>
            <th className={styles.num}>Honorarios</th>
            <th className={styles.num}>Gastos</th>
            <th className={styles.num}>Ayudante</th>
            <th className={styles.num}>Coseguro</th>
            <th className={styles.num}>Total</th>
            <th className={styles.num}>Diferencia</th>
          </tr>
        </thead>
      </table>
      {enBloques(filas).map((bloque) => (
        <table key={bloque[0].id} className={`${styles.tabla} ${styles.bloque}`}>
          <Columnas />
          <tbody>
            {bloque.map((f) => <Fila key={f.id} f={f} />)}
          </tbody>
        </table>
      ))}
    </div>
  );
});

export const ListaOmitidas = memo(function ListaOmitidas({ omitidas }: { omitidas: RecalculoOmitida[] }) {
  return (
    <details className={styles.omitidas}>
      <summary>{omitidas.length} prestaciones que no se tocan, con el motivo</summary>
      <div className={styles.omitidasLista}>
        {enBloques(omitidas).map((bloque) => (
          <ul key={bloque[0].id} className={styles.bloqueOmitidas}>
            {bloque.map((o) => (
              <li key={o.id}>
                <strong>#{o.id}</strong> · socio {o.cod_medico} · {o.cod_nomenclador} · {fechaCorta(o.fecha_practica)} — {o.motivo}
              </li>
            ))}
          </ul>
        ))}
      </div>
    </details>
  );
});
