import React, { useEffect, useMemo, useState } from "react";
import { Calculator, Eye, RefreshCw } from "lucide-react";

import { useAppSnackbar } from "@/app/hooks/useAppSnackbar";
import { fetchPeriodoActivo, previewCierre, recalcularPrecios } from "../api";
import type { CierrePreviewResponse, ObraSocialOption, RecalculoFila, RecalculoResponse } from "../types";
import { mensajeDeError } from "@/app/shared/lib/httpErrors";
import { formatMoney, parseMoney } from "../money";
import ObraSocialAutocomplete from "../components/ObraSocialAutocomplete";
import ConfirmActionModal from "../components/ConfirmActionModal";
import styles from "./RecalculoPrecios.module.scss";
import { ListaOmitidas, TablaCambios } from "./TablaCambios";
import PaginaPasos from "@/app/components/layout/PaginaPasos/PaginaPasos";
import Paso from "@/app/components/ui/Paso/Paso";
import Bloque from "@/app/components/ui/Bloque/Bloque";
import Cifras from "@/app/components/ui/Cifras/Cifras";
import Aviso from "@/app/components/ui/Aviso/Aviso";
import Button from "@/app/components/ui/Button/Button";
import Cargando from "@/app/components/ui/Cargando/Cargando";
import { ErrorAccion } from "@/app/components/ui/ResultadoAccion/ResultadoAccion";
import c from "@/app/components/ui/Paso/Campos.module.scss";

/** Recálculo de precios de una factura abierta (O.S. + período), o de un código de ella. */

/** Las filas de un mismo equipo juntas, en el orden en que aparece cada equipo. */
function agruparPorEquipo(filas: RecalculoFila[]): RecalculoFila[] {
  const orden: number[] = [];
  const grupos = new Map<number, RecalculoFila[]>();
  for (const f of filas) {
    const clave = f.grupo_equipo_id ?? -f.id;
    if (!grupos.has(clave)) {
      grupos.set(clave, []);
      orden.push(clave);
    }
    grupos.get(clave)!.push(f);
  }
  return orden.flatMap((k) => grupos.get(k)!);
}

const RecalculoPrecios: React.FC = () => {
  const notify = useAppSnackbar();

  const [obraSocial, setObraSocial] = useState<ObraSocialOption | null>(null);
  const [periodo, setPeriodo] = useState("");
  const [codigo, setCodigo] = useState("");
  const [factura, setFactura] = useState<CierrePreviewResponse | null>(null);
  const [facturaError, setFacturaError] = useState<string | null>(null);

  const [resultado, setResultado] = useState<RecalculoResponse | null>(null);
  const [trabajando, setTrabajando] = useState<"previa" | "aplicar" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  // Período activo al elegir la O.S. (como en Cierre).
  useEffect(() => {
    if (!obraSocial) return;
    (async () => {
      try {
        const p = await fetchPeriodoActivo(String(obraSocial.nro_obra_social));
        setPeriodo(p.periodo);
      } catch {
        setPeriodo("");
      }
    })();
  }, [obraSocial]);

  // Lo que se ve cambia con la O.S., el período o el código: la vista previa vieja ya no vale.
  useEffect(() => {
    setResultado(null);
    setError(null);
  }, [obraSocial, periodo, codigo]);

  // Contexto de la factura (cantidad, total, abierta/cerrada) sin backend nuevo.
  useEffect(() => {
    if (!obraSocial || periodo.length !== 6) {
      setFactura(null);
      setFacturaError(null);
      return;
    }
    let vigente = true;
    (async () => {
      try {
        const data = await previewCierre(String(obraSocial.nro_obra_social), periodo);
        if (vigente) {
          setFactura(data);
          setFacturaError(null);
        }
      } catch (e) {
        if (vigente) {
          setFactura(null);
          setFacturaError(mensajeDeError(e, "No se pudo leer la factura."));
        }
      }
    })();
    return () => {
      vigente = false;
    };
  }, [obraSocial, periodo]);

  const correr = async (dryRun: boolean) => {
    if (!obraSocial || periodo.length !== 6) return;
    setTrabajando(dryRun ? "previa" : "aplicar");
    setError(null);
    try {
      const r = await recalcularPrecios({
        cod_obra: String(obraSocial.nro_obra_social),
        periodo,
        codigo: codigo.trim() || null,
        dry_run: dryRun,
      });
      setResultado(r);
      if (!dryRun) {
        setConfirmOpen(false);
        notify(`${r.cambian} prestación${r.cambian === 1 ? "" : "es"} recalculada${r.cambian === 1 ? "" : "s"}.`);
        // El total de la factura cambió: se refresca el contexto.
        setFactura(await previewCierre(String(obraSocial.nro_obra_social), periodo));
      }
    } catch (e) {
      setError(mensajeDeError(e, "No se pudo recalcular."));
      if (!dryRun) setConfirmOpen(false);
    } finally {
      setTrabajando(null);
    }
  };

  const filasOrdenadas = useMemo(
    () => (resultado ? agruparPorEquipo(resultado.filas) : []),
    [resultado]
  );

  const cerrada = factura?.cerrado ?? false;
  const listo = !!obraSocial && periodo.length === 6 && !cerrada && !trabajando;
  const puedeAplicar = !!resultado && resultado.dry_run && resultado.cambian > 0 && listo;
  const diferencia = resultado ? parseMoney(resultado.diferencia) : 0;

  return (
    <PaginaPasos titulo="Recalcular precios" icono={Calculator} ancha>
      <Paso numero={1} titulo="Factura">
        <div className={c.formulario}>
          <label className={c.campo}>
            <span className={c.rotulo}>Obra social</span>
            <ObraSocialAutocomplete
              value={obraSocial?.nro_obra_social ?? null}
              onChange={(_, os) => setObraSocial(os)}
              disabled={!!trabajando}
            />
          </label>
          <label className={c.campo}>
            <span className={c.rotulo}>Período</span>
            <input
              className={c.entrada}
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={periodo}
              onChange={(e) => setPeriodo(e.target.value.replace(/\D/g, ""))}
              placeholder="Ej. 202609"
              disabled={!obraSocial || !!trabajando}
            />
          </label>
          <label className={c.campo}>
            <span className={c.rotulo}>Código</span>
            <input
              className={c.entrada}
              type="text"
              inputMode="numeric"
              value={codigo}
              onChange={(e) => setCodigo(e.target.value.trim())}
              placeholder="Vacío: todas las prestaciones"
              disabled={!obraSocial || !!trabajando}
            />
          </label>
        </div>

        {facturaError && <ErrorAccion>{facturaError}</ErrorAccion>}
        {factura && (
          <Cifras
            items={[
              { valor: factura.cantidad, rotulo: factura.cantidad !== 1 ? "prestaciones" : "prestación" },
              { valor: formatMoney(factura.importe_total), rotulo: "total" },
              { valor: cerrada ? "Cerrada" : "Abierta", rotulo: "estado", tono: cerrada ? "apagada" : undefined },
            ]}
          />
        )}
        {cerrada && <Aviso>La factura de este período ya está cerrada: sus precios no se pueden recalcular.</Aviso>}
        <Aviso tono="info">
          Se usa la fecha de cada práctica (sin fecha, la de hoy) y la especialidad principal del médico. Las manuales,
          las que no tienen precio y las que darían $0 no se tocan.
        </Aviso>
      </Paso>

      <Paso numero={2} titulo="Revisar y aplicar">
        <div className={c.acciones}>
          <Button
            variant="ghost"
            leftIcon={<Eye size={16} aria-hidden="true" />}
            disabled={!listo}
            isLoading={trabajando === "previa"}
            onClick={() => void correr(true)}
          >
            {resultado?.dry_run ? "Actualizar vista previa" : "Vista previa"}
          </Button>
          <Button
            variant="danger"
            leftIcon={<RefreshCw size={16} aria-hidden="true" />}
            disabled={!puedeAplicar}
            onClick={() => setConfirmOpen(true)}
            title={!resultado?.dry_run ? "Primero generá la vista previa" : undefined}
          >
            Aplicar recálculo
          </Button>
        </div>

        {trabajando && (
          <p className={styles.cargando}>
            <Cargando size={20} tono="marca" />
            {trabajando === "previa"
              ? "Calculando la vista previa… puede tardar en facturas grandes."
              : `Recalculando ${resultado?.cambian ?? ""} prestaciones… no cierres esta pantalla.`}
          </p>
        )}
        {error && <ErrorAccion>{error}</ErrorAccion>}

        {resultado && (
          <Bloque>
            <h3 className={c.subtitulo}>
              {resultado.dry_run ? "Vista previa: no se grabó nada" : "Resultado"}
              {resultado.codigo ? ` · código ${resultado.codigo}` : ""}
            </h3>
            <Cifras
              items={[
                { valor: resultado.cambian, rotulo: resultado.dry_run ? "cambian" : "recalculadas" },
                { valor: resultado.sin_cambios, rotulo: "sin cambios", tono: "apagada" },
                { valor: resultado.omitidas, rotulo: "no se tocan", tono: "apagada" },
                { valor: `${formatMoney(resultado.importe_antes)} → ${formatMoney(resultado.importe_despues)}`, rotulo: "total antes y después" },
                { valor: `${diferencia > 0 ? "+" : ""}${formatMoney(resultado.diferencia)}`, rotulo: "diferencia", tono: diferencia < 0 ? "error" : undefined },
                ...(resultado.publicadas_afectadas > 0
                  ? [{ valor: resultado.publicadas_afectadas, rotulo: "ya publicadas al médico" }]
                  : []),
              ]}
            />
            {filasOrdenadas.length > 0 && <TablaCambios filas={filasOrdenadas} />}
            {resultado.omitidas_detalle.length > 0 && <ListaOmitidas omitidas={resultado.omitidas_detalle} />}
          </Bloque>
        )}
      </Paso>

      {resultado && (
        <ConfirmActionModal
          isOpen={confirmOpen}
          icon={RefreshCw}
          variant="danger"
          title="Aplicar el recálculo"
          message={
            <>
              Se van a recalcular <strong>{resultado.cambian}</strong> prestaciones de la O.S.{" "}
              {resultado.cod_obra}, período {resultado.periodo}
              {resultado.codigo ? `, código ${resultado.codigo}` : ""}. El total de la factura pasa de{" "}
              {formatMoney(resultado.importe_antes)} a <strong>{formatMoney(resultado.importe_despues)}</strong>.
            </>
          }
          warning={
            <>
              No se puede deshacer.
              {resultado.publicadas_afectadas > 0 &&
                ` ${resultado.publicadas_afectadas} ya están publicadas: el médico verá el importe nuevo.`}
            </>
          }
          confirmLabel={trabajando === "aplicar" ? "Recalculando…" : "Aplicar"}
          onClose={() => setConfirmOpen(false)}
          onConfirm={() => void correr(false)}
          loading={trabajando === "aplicar"}
        />
      )}
    </PaginaPasos>
  );
};

export default RecalculoPrecios;
