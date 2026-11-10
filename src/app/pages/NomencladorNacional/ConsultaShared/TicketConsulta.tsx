import { memo } from "react";
import type { ReactNode } from "react";
import { CheckCircle2, DollarSign, Info, Search, XCircle } from "lucide-react";

import s from "./TicketConsulta.module.scss";
import { ORIGEN_LABELS } from "../nomenclador.types";
import type { TablaValorItem, ViaPractica } from "../nomenclador.types";
import { formatoPesos, formatoUnidades } from "@/app/shared/lib/formatos";
import { formatFecha } from "@/app/shared/lib/fechas";
import Aviso from "@/app/components/ui/Aviso/Aviso";
import Button from "@/app/components/ui/Button/Button";
import Cargando from "@/app/components/ui/Cargando/Cargando";
import Segmentos from "@/app/components/ui/Segmentos/Segmentos";

type Props = {
  /** Los combos de la cabecera: obra social, práctica y, para el Colegio, especialidad. */
  campos: ReactNode;
  via: ViaPractica;
  onVia: (v: ViaPractica) => void;
  puedeConsultar: boolean;
  consultando: boolean;
  onConsultar: () => void;
  resultado: TablaValorItem | null;
  /** Sólo con un mensaje después de consultar. */
  error: string | null;
  /** Lo que paga el afiliado, si la obra social cobra copago. */
  copago: number | null;
  /** Vista del Colegio: la cuenta de cada concepto, el origen y la vigencia. */
  conDetalle?: boolean;
  /** Si la práctica la puede facturar la especialidad elegida (`valida === null`: verificando). */
  habilitada?: { nombre: string; valida: boolean | null } | null;
};

const CONCEPTOS = ["Honorarios", "Gastos", "Ayudante"] as const;

/** Un concepto del ticket: nombre, puntos y subtotal. */
function Renglon({ concepto, comp, conDetalle }: {
  concepto: (typeof CONCEPTOS)[number];
  comp: TablaValorItem["componentes"][number];
  conDetalle: boolean;
}) {
  const cantidad = parseFloat(comp.cantidad);
  const unitario = parseFloat(comp.valor_unitario);
  // Con cantidad 0 (el caso típico de Ayudante) no hay cuenta que mostrar.
  const hayCuenta = conDetalle && cantidad > 0 && !isNaN(unitario);

  return (
    <li className={s.renglon}>
      <span className={s.concepto}>
        {concepto}
        {hayCuenta && (
          <small className={s.cuenta}>
            {formatoUnidades.format(cantidad)} × {formatoPesos.format(unitario)}
            {comp.galeno_nivel != null && ` · nivel ${comp.galeno_nivel}`}
          </small>
        )}
      </span>
      <span className={s.puntos} aria-hidden="true" />
      <span className={s.importe}>{formatoPesos.format(parseFloat(comp.subtotal))}</span>
    </li>
  );
}

/** El resultado de la consulta: título, conceptos, total y copago. */
function Resultado({ r, copago, conDetalle, habilitada }: Pick<Props, "copago" | "conDetalle" | "habilitada"> & { r: TablaValorItem }) {
  const porPresupuesto = Boolean(r.por_presupuesto);
  const total = parseFloat(r.precio_total);

  return (
    <>
      <div className={s.cuerpo}>
        <div className={s.titulo}>
          <h2 className={s.nombre}>{r.descripcion || r.codigo}</h2>
          <span className={`${s.pildora} ${s.codigo}`}>{r.codigo}</span>
          {r.via_aplicada === "L" && <span className={`${s.pildora} ${s.neutra}`}>Vía laparoscópica</span>}
          {habilitada && (
            <span
              className={`${s.pildora} ${habilitada.valida === null ? s.neutra : habilitada.valida ? s.ok : s.no}`}
            >
              {habilitada.valida === null ? (
                <><Cargando size={13} /> {habilitada.nombre}: verificando…</>
              ) : habilitada.valida ? (
                <><CheckCircle2 size={13} /> {habilitada.nombre}: habilitada</>
              ) : (
                <><XCircle size={13} /> {habilitada.nombre}: no habilitada</>
              )}
            </span>
          )}
        </div>

        {!porPresupuesto && (
          <ul className={s.conceptos}>
            {CONCEPTOS.map((nombre) => {
              const comp = r.componentes.find((c) => c.concepto.toLowerCase() === nombre.toLowerCase());
              return comp ? <Renglon key={nombre} concepto={nombre} comp={comp} conDetalle={Boolean(conDetalle)} /> : null;
            })}
          </ul>
        )}
      </div>

      <div className={s.corte} aria-hidden="true" />

      <div className={s.total}>
        <span className={s.totalRotulo}>{porPresupuesto ? "Valor honorario" : "Total"}</span>
        <span className={s.totalValor}>
          {porPresupuesto ? "Por presupuesto" : formatoPesos.format(isNaN(total) ? 0 : total)}
        </span>
      </div>

      <div className={s.pie}>
        {copago !== null && copago > 0 && (
          <div className={s.copago}>
            <span>Copago · lo paga el afiliado</span>
            <b>{formatoPesos.format(copago)}</b>
          </div>
        )}
        {conDetalle && (
          <div className={s.origen}>
            <span>
              {ORIGEN_LABELS[r.origen]}
              {r.nivel != null && ` · nivel ${r.nivel}`}
            </span>
            <span>Vigente desde {formatFecha(r.vigencia_desde)}</span>
          </div>
        )}
        <p className={s.nota}>
          <Info size={15} aria-hidden="true" />
          Los precios pueden cambiar según cada obra social.
        </p>
      </div>
    </>
  );
}

/** La tarjeta de las consultas de precio: lo que se busca a la izquierda y lo que vale a la derecha. */
function TicketConsulta({
  campos,
  via,
  onVia,
  puedeConsultar,
  consultando,
  onConsultar,
  resultado,
  error,
  copago,
  conDetalle = false,
  habilitada = null,
}: Props) {
  return (
    <article className={s.ticket}>
      <div className={s.cabeza}>
        {campos}

        <div className={s.acciones}>
          <Segmentos
            ariaLabel="Vía de realización"
            valor={via}
            onChange={onVia}
            opciones={[
              { valor: "T", rotulo: "Tradicional" },
              { valor: "L", rotulo: "Laparoscópica" },
            ]}
          />
          <Button
            variant="secondary"
            className={s.consultar}
            size="lg"
            leftIcon={<Search size={18} />}
            onClick={onConsultar}
            disabled={!puedeConsultar}
            isLoading={consultando}
          >
            Consultar precio
          </Button>
        </div>
      </div>

      <div className={s.panel}>
        {consultando ? (
          <div className={s.estado} aria-live="polite">
            <Cargando size={22} />
            Consultando…
          </div>
        ) : resultado ? (
          <>
            <Resultado r={resultado} copago={copago} conDetalle={conDetalle} habilitada={habilitada} />
            {via === "L" && resultado.via_aplicada === "T" && (
              <div className={s.aparte}>
                <Aviso>Este código no admite vía laparoscópica; se muestra el precio tradicional.</Aviso>
              </div>
            )}
          </>
        ) : error ? (
          <div className={s.aparte}>
            <Aviso>{error}</Aviso>
          </div>
        ) : (
          <div className={s.estado}>
            <span className={s.icono}>
              <DollarSign size={26} aria-hidden="true" />
            </span>
            <span className={s.estadoTitulo}>Elegí obra social y práctica</span>
            El precio aparece acá.
          </div>
        )}
      </div>
    </article>
  );
}

export default memo(TicketConsulta);
