import { memo } from "react";
import Paso from "@/app/components/ui/Paso/Paso";
import Segmentos from "@/app/components/ui/Segmentos/Segmentos";
import c from "@/app/components/ui/Paso/Campos.module.scss";
import s from "./Alcance.module.scss";
import Fichas from "@/app/components/ui/Fichas/Fichas";
import { LARGO_CODIGO, MAX_CODIGOS, type Alcance as TipoAlcance } from "../aumento.helpers";
import Button from "@/app/components/ui/Button/Button";

type Props = {
  numero: number;
  alcance: TipoAlcance;
  onAlcance: (a: TipoAlcance) => void;
  codigoTipeado: string;
  onCodigoTipeado: (v: string) => void;
  onAgregar: () => void;
  codigos: string[];
  onQuitar: (codigo: string) => void;
  onLimpiar: () => void;
  desde: string;
  onDesde: (v: string) => void;
  hasta: string;
  onHasta: (v: string) => void;
};

const OPCIONES: { valor: TipoAlcance; rotulo: string }[] = [
  { valor: "todos", rotulo: "Todos los códigos" },
  { valor: "codigos", rotulo: "Por códigos" },
  { valor: "rango", rotulo: "Por rango" },
];

/** Paso «Alcance»: a qué códigos de precio fijo se aplica el porcentaje; los galenos no dependen de él. */
function Alcance(p: Props) {
  return (
    <Paso numero={p.numero} titulo="Alcance de valores fijos">
      <Segmentos opciones={OPCIONES} valor={p.alcance} onChange={p.onAlcance} ariaLabel="Alcance del aumento" />

      {p.alcance === "codigos" && (
        <div className={c.campo}>
          <div className={s.agregar}>
            <input
              className={c.entrada}
              placeholder="Código y Enter"
              aria-label="Agregar código"
              maxLength={LARGO_CODIGO}
              value={p.codigoTipeado}
              onChange={(e) => p.onCodigoTipeado(e.target.value)}
              onKeyDown={(e) => {
                if (e.key !== "Enter") return;
                e.preventDefault();
                p.onAgregar();
              }}
            />
            <Button variant="ghost" onClick={p.onAgregar} disabled={!p.codigoTipeado.trim() || p.codigos.length >= MAX_CODIGOS}>
              Agregar
            </Button>
          </div>
          {p.codigos.length > 0 && (
            <Fichas items={p.codigos.map((codigo) => ({ clave: codigo, texto: codigo }))} onQuitar={p.onQuitar} onLimpiar={p.onLimpiar} />
          )}
        </div>
      )}

      {p.alcance === "rango" && (
        <>
          <div className={c.campo}>
            <label className={c.rotulo} htmlFor="aumento-desde">Código desde</label>
            <input
              id="aumento-desde"
              className={c.entrada}
              placeholder="420000"
              maxLength={LARGO_CODIGO}
              value={p.desde}
              onChange={(e) => p.onDesde(e.target.value)}
            />
          </div>
          <div className={c.campo}>
            <label className={c.rotulo} htmlFor="aumento-hasta">Código hasta</label>
            <input
              id="aumento-hasta"
              className={c.entrada}
              placeholder="429999"
              maxLength={LARGO_CODIGO}
              value={p.hasta}
              onChange={(e) => p.onHasta(e.target.value)}
            />
            <p className={c.ayuda}>Incluye ambos extremos; se compara como número.</p>
          </div>
        </>
      )}
    </Paso>
  );
}

export default memo(Alcance);
