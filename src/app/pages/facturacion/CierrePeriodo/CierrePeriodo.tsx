import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FileCheck2, Paperclip, X } from "lucide-react";

import { conProceso } from "@/app/hooks/proceso";
import { previewCierre, cerrarPeriodo, fetchPeriodoActivo } from "../api";
import type { CierrePreviewResponse, ObraSocialOption } from "../types";
import { detailMessage } from "../types";
import { formatMoney } from "../money";
import ObraSocialAutocomplete from "../components/ObraSocialAutocomplete";
import ConfirmarCierreModal from "./ConfirmarCierreModal";
import PaginaPasos from "@/app/components/layout/PaginaPasos/PaginaPasos";
import Paso from "@/app/components/ui/Paso/Paso";
import Cifras from "@/app/components/ui/Cifras/Cifras";
import Aviso from "@/app/components/ui/Aviso/Aviso";
import Button from "@/app/components/ui/Button/Button";
import Cargando from "@/app/components/ui/Cargando/Cargando";
import { ErrorAccion } from "@/app/components/ui/ResultadoAccion/ResultadoAccion";
import c from "@/app/components/ui/Paso/Campos.module.scss";
import { comoErrorApi } from "@/app/shared/lib/httpErrors";

const TIPOS_FACTURA = ["A", "B", "C"];

const CierrePeriodo: React.FC = () => {
  const navigate = useNavigate();

  const [obraSocial, setObraSocial] = useState<ObraSocialOption | null>(null);
  const [periodo, setPeriodo] = useState("");
  const [preview, setPreview] = useState<CierrePreviewResponse | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);

  const [tipoFactura, setTipoFactura] = useState("");
  const [nroFactura, setNroFactura] = useState("");
  const [archivo, setArchivo] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [cerrando, setCerrando] = useState(false);

  // Cargar período activo cuando se elige OS
  useEffect(() => {
    if (!obraSocial) return;
    setPreview(null);
    setPreviewError(null);
    (async () => {
      try {
        const p = await fetchPeriodoActivo(String(obraSocial.nro_obra_social));
        setPeriodo(p.periodo);
      } catch {
        setPeriodo("");
      }
    })();
  }, [obraSocial]);

  // Cargar preview cuando hay OS + período
  useEffect(() => {
    if (!obraSocial || !periodo || periodo.length !== 6) {
      setPreview(null);
      return;
    }
    setPreviewLoading(true);
    setPreviewError(null);
    (async () => {
      try {
        const data = await previewCierre(String(obraSocial.nro_obra_social), periodo);
        setPreview(data);
      } catch (e) {
        const err = comoErrorApi(e);
        setPreviewError(detailMessage(err?.response?.data?.detail));
        setPreview(null);
      } finally {
        setPreviewLoading(false);
      }
    })();
  }, [obraSocial, periodo]);

  const handleCerrar = async () => {
    if (!obraSocial || !periodo || !preview) return;
    setCerrando(true);
    const result = await conProceso(
      {
        haciendo: "Cerrando el período",
        listo: "Período cerrado",
        detalleListo: (r) => `Factura #${r.id_factura} · ${formatMoney(r.importe_total)}`,
        fallo: "No se pudo cerrar",
        detalleFallo: (e) => detailMessage(comoErrorApi(e).response?.data?.detail) || undefined,
      },
      () =>
        cerrarPeriodo({
          cod_obra: String(obraSocial.nro_obra_social),
          periodo,
          tipo_factura: tipoFactura || undefined,
          nro_factura: nroFactura || undefined,
          archivo,
        }),
    );
    setCerrando(false);
    if (result) {
      setConfirmOpen(false);
      navigate("/panel/facturacion/periodos");
    }
  };

  const quitarArchivo = () => {
    setArchivo(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // Con documentación digital hay que auditar todo antes de cerrar.
  const bloqueadaPorAuditoria = !!preview?.documentacion_digital && (preview.sin_auditar ?? 0) > 0;
  const canCerrar = !!preview && !preview.cerrado && preview.cantidad > 0 && !cerrando && !bloqueadaPorAuditoria;
  const sinValorizar = preview?.sin_valorizar ?? 0;

  return (
    <PaginaPasos titulo="Cerrar factura" icono={FileCheck2}>
      <Paso numero={1} titulo="Obra social y período">
        <div className={c.formulario}>
          <label className={c.campo}>
            <span className={c.rotulo}>Obra social</span>
            <ObraSocialAutocomplete
              value={obraSocial?.nro_obra_social ?? null}
              onChange={(_, os) => setObraSocial(os)}
              disabled={cerrando}
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
              onChange={(e) => setPeriodo(e.target.value)}
              placeholder="Ej. 202607"
              disabled={!obraSocial || cerrando}
            />
          </label>
        </div>

        {previewLoading && <Cargando size={20} tono="marca" aria-label="Cargando el período" />}
        {previewError && <ErrorAccion>{previewError}</ErrorAccion>}

        {preview && (
          <Cifras
            items={[
              { valor: preview.cantidad, rotulo: preview.cantidad !== 1 ? "prestaciones" : "prestación" },
              { valor: formatMoney(preview.importe_total), rotulo: "total" },
              { valor: preview.cerrado ? "Cerrado" : "Abierto", rotulo: "estado", tono: preview.cerrado ? "apagada" : undefined },
            ]}
          />
        )}

        {sinValorizar > 0 && !preview?.cerrado && (
          <Aviso>
            Quedan {sinValorizar} prestación{sinValorizar === 1 ? "" : "es"} sin valorizar (en $0 porque el código todavía no
            tenía precio). Podés cerrar igual o esperar al precio y revalorizarlas desde Valores por obra social.
          </Aviso>
        )}
        {preview?.cerrado && <Aviso tono="info">Este período ya tiene una factura generada: no se puede volver a cerrar.</Aviso>}
      </Paso>

      <Paso numero={2} titulo="Datos de la factura">
        <div className={c.formulario}>
          <label className={c.campo}>
            <span className={c.rotulo}>Tipo de factura</span>
            <select
              className={c.seleccion}
              value={tipoFactura}
              onChange={(e) => setTipoFactura(e.target.value)}
              disabled={cerrando}
            >
              <option value="">Sin especificar</option>
              {TIPOS_FACTURA.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </label>
          <label className={c.campo}>
            <span className={c.rotulo}>Nº de factura</span>
            <input
              className={c.entrada}
              type="text"
              value={nroFactura}
              onChange={(e) => setNroFactura(e.target.value)}
              placeholder="Ej. 0001-00012345"
              disabled={cerrando}
            />
          </label>
          <div className={c.campo}>
            <span className={c.rotulo}>Documento</span>
            <div className={c.acciones}>
              <Button
                variant="ghost"
                leftIcon={<Paperclip size={16} aria-hidden="true" />}
                onClick={() => fileInputRef.current?.click()}
                disabled={cerrando}
              >
                {archivo ? archivo.name : "Adjuntar PDF o imagen"}
              </Button>
              {archivo && (
                <Button variant="ghost" leftIcon={<X size={16} aria-hidden="true" />} onClick={quitarArchivo} disabled={cerrando}>
                  Quitar
                </Button>
              )}
              <input
                ref={fileInputRef}
                type="file"
                hidden
                accept="application/pdf,image/*"
                onChange={(e) => setArchivo(e.target.files?.[0] ?? null)}
                disabled={cerrando}
              />
            </div>
            <p className={c.ayuda}>Opcional.</p>
          </div>
        </div>
      </Paso>

      <Paso numero={3} titulo="Cerrar el período" peligro>
        <Aviso>El cierre no se puede deshacer: genera la factura y habilita la liquidación.</Aviso>
        {bloqueadaPorAuditoria && (
          <ErrorAccion>
            No se puede cerrar: hay {preview?.sin_auditar} prestaci{preview?.sin_auditar === 1 ? "ón" : "ones"} sin auditar.
            Auditalas desde el listado de la factura y volvé a intentar.
          </ErrorAccion>
        )}
        <div className={c.acciones}>
          <Button variant="ghost" onClick={() => navigate("/panel/facturacion/periodos")} disabled={cerrando}>
            Cancelar
          </Button>
          <Button variant="danger" onClick={() => setConfirmOpen(true)} disabled={!canCerrar} isLoading={cerrando}>
            Cerrar período
          </Button>
        </div>
      </Paso>

      {preview && obraSocial && (
        <ConfirmarCierreModal
          isOpen={confirmOpen}
          preview={preview}
          osNombre={obraSocial.nombre}
          tipoFactura={tipoFactura}
          nroFactura={nroFactura}
          archivoNombre={archivo?.name ?? null}
          onClose={() => setConfirmOpen(false)}
          onConfirm={handleCerrar}
          loading={cerrando}
        />
      )}
    </PaginaPasos>
  );
};

export default CierrePeriodo;
