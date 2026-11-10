import React, { useEffect, useState } from "react";
import { Layers } from "lucide-react";
import Dialogo, { DialogoAviso, DialogoCampo, DialogoDatos } from "@/app/components/ui/Dialogo/Dialogo";
import Cargando from "@/app/components/ui/Cargando/Cargando";
import Button from "@/app/components/ui/Button/Button";
import { crearComplemento, fetchPeriodoActivo, previewCierre } from "../api";
import type { CierrePreviewResponse, FacturaRead, ObraSocialOption } from "../types";
import { detailMessage } from "../types";
import { formatMoney } from "../money";
import ObraSocialAutocomplete from "../components/ObraSocialAutocomplete";
import { comoErrorApi } from "@/app/shared/lib/httpErrors";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (factura: FacturaRead) => void;
}

const ERRORES: Record<number, string> = {
  404: "No hay una factura previa para complementar en este período.",
  409: "Ya hay una factura abierta para este período — cargá las prestaciones ahí, no hace falta un complemento.",
};

const NuevaComplementariaModal: React.FC<Props> = ({ isOpen, onClose, onCreated }) => {
  const [obraSocial, setObraSocial] = useState<ObraSocialOption | null>(null);
  const [periodo, setPeriodo] = useState("");
  const [preview, setPreview] = useState<CierrePreviewResponse | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [creando, setCreando] = useState(false);

  // Limpiar todo al cerrar, para que la próxima apertura arranque en blanco.
  useEffect(() => {
    if (isOpen) return;
    setObraSocial(null);
    setPeriodo("");
    setPreview(null);
    setError(null);
  }, [isOpen]);

  // Al elegir OS, proponer su período activo.
  useEffect(() => {
    if (!obraSocial) return;
    setPreview(null);
    setError(null);
    (async () => {
      try {
        const p = await fetchPeriodoActivo(String(obraSocial.nro_obra_social));
        setPeriodo(p.periodo);
      } catch {
        setPeriodo("");
      }
    })();
  }, [obraSocial]);

  // Preview del período elegido: define si se puede complementar.
  useEffect(() => {
    if (!obraSocial || periodo.length !== 6) {
      setPreview(null);
      return;
    }
    let cancelado = false;
    setPreviewLoading(true);
    setError(null);
    (async () => {
      try {
        const data = await previewCierre(String(obraSocial.nro_obra_social), periodo);
        if (!cancelado) setPreview(data);
      } catch (e) {
        const err = comoErrorApi(e);
        if (!cancelado) {
          setError(detailMessage(err?.response?.data?.detail));
          setPreview(null);
        }
      } finally {
        if (!cancelado) setPreviewLoading(false);
      }
    })();
    return () => { cancelado = true; };
  }, [obraSocial, periodo]);

  const handleCrear = async () => {
    if (!obraSocial || !preview) return;
    setCreando(true);
    setError(null);
    try {
      const factura = await crearComplemento({
        cod_obra: String(obraSocial.nro_obra_social),
        periodo,
      });
      onCreated(factura);
    } catch (e) {
      const err = comoErrorApi(e);
      const status = err?.response?.status;
      setError((status !== undefined ? ERRORES[status] : undefined) ?? detailMessage(err?.response?.data?.detail) ?? "Error al abrir el complemento.");
    } finally {
      setCreando(false);
    }
  };

  // Sin factura cerrada no hay nada que complementar: hay que seguir cargando en la que está abierta.
  const puedeCrear = !!preview && preview.cerrado && !creando;

  if (!isOpen) return null;

  return (
    <Dialogo
      titulo="Nueva complementaria"
      icono={Layers}
      onClose={creando ? undefined : onClose}
      acciones={
        <>
          <Button variant="ghost" onClick={onClose} disabled={creando}>Cancelar</Button>
          <Button variant="primary" onClick={handleCrear} disabled={!puedeCrear} isLoading={creando}>
            Abrir complemento
          </Button>
        </>
      }
    >
      <DialogoAviso>Abre una factura adicional para un período ya cerrado, donde cargar lo que quedó afuera del envío.</DialogoAviso>

      <DialogoCampo rotulo="Obra social">
        <ObraSocialAutocomplete
          value={obraSocial?.nro_obra_social ?? null}
          onChange={(_, os) => setObraSocial(os)}
          disabled={creando}
        />
      </DialogoCampo>

      <DialogoCampo rotulo="Período" htmlFor="complemento-periodo">
        <input
          id="complemento-periodo"
          type="text"
          inputMode="numeric"
          maxLength={6}
          value={periodo}
          onChange={(e) => setPeriodo(e.target.value)}
          placeholder="Ej. 202607"
          disabled={!obraSocial || creando}
        />
      </DialogoCampo>

      {previewLoading && <Cargando size={18} tono="marca" aria-label="Cargando el período" />}

      {preview && (
        <DialogoDatos
          filas={[
            { rotulo: "Prestaciones", valor: preview.cantidad },
            { rotulo: "Total", valor: formatMoney(preview.importe_total) },
            { rotulo: "Estado", valor: preview.cerrado ? "Cerrado" : "Abierto" },
          ]}
        />
      )}

      {preview && !preview.cerrado && (
        <DialogoAviso>Este período sigue abierto: cargá las prestaciones ahí. Un complemento sólo sirve con la factura anterior ya cerrada y enviada.</DialogoAviso>
      )}

      {error && <DialogoAviso tono="peligro">{error}</DialogoAviso>}
    </Dialogo>
  );
};

export default NuevaComplementariaModal;
