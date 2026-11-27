import React, { useEffect, useState } from "react";
import { getLote } from "@/app/pages/Pagos/pagos.api";
import { DialogoAviso } from "@/app/components/ui/Dialogo/Dialogo";
import paleta from "@/app/styles/paleta.module.scss";
import type { Ajuste } from "../types";
import PorcentajeAlPasar from "./PorcentajeAlPasar";
import { pasoAlPagoValido, porcentajeComun } from "./utiles";

/** Lo escrito en el campo y si ya se puede confirmar con eso. */
export type PasoElegido = { valor: string; listo: boolean };

type Props = {
  ids: number[];
  onChange: (paso: PasoElegido) => void;
};

/** El campo «% de pago» cuando se pasan lotes desde una lista: lee sus ítems para proponer el % y mostrar lo que entra. */
const PorcentajeDeLotes: React.FC<Props> = ({ ids, onChange }) => {
  const [ajustes, setAjustes] = useState<Ajuste[] | null>(null);
  const [valor, setValor] = useState("");
  const [fallo, setFallo] = useState(false);
  const clave = ids.join(",");

  useEffect(() => {
    let vigente = true;
    setAjustes(null);
    setFallo(false);
    Promise.all(clave.split(",").map((id) => getLote(id)))
      .then((lotes) => {
        if (!vigente) return;
        const todos = lotes.flatMap((l) => l.ajustes ?? []);
        setValor(String(porcentajeComun(todos) ?? ""));
        setAjustes(todos);
      })
      .catch(() => {
        if (vigente) setFallo(true);
      });
    return () => {
      vigente = false;
    };
  }, [clave]);

  const listo = ajustes !== null && pasoAlPagoValido(ajustes, valor);

  useEffect(() => {
    onChange({ valor, listo });
  }, [valor, listo, onChange]);

  // Al cerrar la confirmación no queda nada elegido para la próxima.
  useEffect(() => () => onChange({ valor: "", listo: false }), [onChange]);

  if (fallo) return <DialogoAviso tono="peligro">No se pudieron leer los lotes. Cerrá esta ventana y probá de nuevo.</DialogoAviso>;
  if (!ajustes) return <span style={{ fontSize: 13, color: paleta.gray500 }}>Leyendo los lotes…</span>;
  return <PorcentajeAlPasar ajustes={ajustes} valor={valor} onChange={setValor} cantidadLotes={ids.length} />;
};

export default PorcentajeDeLotes;
