import React from "react";
import { DialogoAviso, DialogoCampo } from "@/app/components/ui/Dialogo/Dialogo";
import paleta from "@/app/styles/paleta.module.scss";
import { type Ajuste, aNumeroPorcentaje, fmt, verPorcentajeItem } from "../types";
import { pasoAlPagoValido, porcentajeComun, totalesAlPasar } from "./utiles";

type Props = {
  ajustes: Ajuste[];
  /** Lo escrito en el campo; vacío = cada ítem con el suyo (sólo si tienen distintos). */
  valor: string;
  onChange: (valor: string) => void;
  /** Cuántos lotes pasan juntos (desde una lista); `ajustes` son los de todos. */
  cantidadLotes?: number;
};

/** El campo «% de pago» de la confirmación «Pasar a liquidaciones», igual que al agregar una factura al pago. */
const PorcentajeAlPasar: React.FC<Props> = ({ ajustes, valor, onChange, cantidadLotes = 1 }) => {
  const varios = cantidadLotes > 1;
  const comun = porcentajeComun(ajustes);
  const respetar = comun === null && valor.trim() === "";
  const valido = pasoAlPagoValido(ajustes, valor);
  const porcentaje = respetar ? null : aNumeroPorcentaje(valor);
  const cargado = totalesAlPasar(ajustes, 100);
  const entra = totalesAlPasar(ajustes, valido ? porcentaje : null);
  const distintos = [...new Set(ajustes.map((a) => Number(a.porcentaje_pago ?? 100)))].sort((a, b) => a - b);

  return (
    <>
      <DialogoCampo rotulo={varios ? "% de pago de los lotes" : "% de pago del lote"} htmlFor="lote-pct-pasar">
        <input
          id="lote-pct-pasar"
          type="text"
          inputMode="decimal"
          value={valor}
          onChange={(e) => onChange(e.target.value)}
          placeholder={comun === null ? "El de cada ítem" : "100"}
        />
      </DialogoCampo>
      <span style={{ fontSize: 12, color: paleta.gray500 }}>
        {!valido ? (
          "Poné un número entre 0,01 y 200."
        ) : (
          <>
            {porcentaje === null
              ? `Los ítems tienen distintos porcentajes (${distintos.map(verPorcentajeItem).join(", ")}) y cada uno entra con el suyo. Escribí un número para aplicarlo a todos.`
              : `Todos los débitos y créditos ${varios ? `de los ${cantidadLotes} lotes` : "del lote"} entran al pago al ${verPorcentajeItem(porcentaje)} de lo cargado.`}{" "}
            Débitos ${fmt(entra.debitos)}
            {entra.debitos !== cargado.debitos && <> (cargado ${fmt(cargado.debitos)})</>}; créditos ${fmt(entra.creditos)}
            {entra.creditos !== cargado.creditos && <> (cargado ${fmt(cargado.creditos)})</>}.
          </>
        )}
      </span>
      {valido && porcentaje !== null && porcentaje > 100 && (
        <DialogoAviso>
          <b>Más del 100 %</b>: entra más de lo cargado en {varios ? "los lotes" : "el lote"}.
        </DialogoAviso>
      )}
    </>
  );
};

export default PorcentajeAlPasar;
