import React, { useEffect, useRef, useState } from "react";
import { FileUp, Paperclip } from "lucide-react";

import Button from "@/app/components/ui/Button/Button";
import BotonPlano from "@/app/components/ui/BotonPlano/BotonPlano";
import Caja from "@/app/components/ui/Caja/Caja";
import { useAppSnackbar } from "@/app/hooks/useAppSnackbar";
import { abrirAdjunto } from "@/app/shared/lib/archivos";
import { detalleDeError } from "@/app/shared/lib/httpErrors";
import { guardarFacturaRefact, quitarDocumentoRefact, subirDocumentoRefact } from "../pagos.api";
import type { LoteAjuste, TipoFacturaRefact } from "../types";
import lq from "../Liquidacion.module.scss";
import styles from "./FacturaRefacturacion.module.scss";

const MAX_MB = 10;
const EXTENSIONES = [".pdf", ".jpg", ".jpeg", ".png"];

interface Props {
  lote: LoteAjuste;
  /** El lote como lo devolvió la API después de guardar. */
  onLote: (lote: LoteAjuste) => void;
}

/**
 * La factura nueva que genera el Colegio por una refacturación (tipo A/B/C, número en texto libre y un único archivo).
 * Es opcional y se corrige con el lote abierto, cerrado o en el pago; aplicado (pago cerrado) queda sólo de lectura.
 * El número de la factura que se corrige (original) se ve aparte, en la cabecera del lote.
 */
const FacturaRefacturacion: React.FC<Props> = ({ lote, onLote }) => {
  const notify = useAppSnackbar();
  const refArchivo = useRef<HTMLInputElement>(null);
  const [tipo, setTipo] = useState<string>(lote.refact_tipo_factura ?? "");
  const [nro, setNro] = useState(lote.refact_nro_factura ?? "");
  const [ocupado, setOcupado] = useState(false);

  // Si el lote cambia desde afuera (recarga, otra pantalla), el formulario vuelve a lo guardado.
  useEffect(() => {
    setTipo(lote.refact_tipo_factura ?? "");
    setNro(lote.refact_nro_factura ?? "");
  }, [lote.id, lote.refact_tipo_factura, lote.refact_nro_factura]);

  const soloLectura = lote.estado === "AP";
  const nroLimpio = nro.trim();
  const cambio = tipo !== (lote.refact_tipo_factura ?? "") || nroLimpio !== (lote.refact_nro_factura ?? "");
  const incompleto = (nroLimpio !== "") !== (tipo !== "");
  const tieneArchivo = !!lote.refact_documento_url;

  const ejecutar = async <T,>(accion: () => Promise<T>, errorPorDefecto: string): Promise<T | null> => {
    setOcupado(true);
    try {
      return await accion();
    } catch (e) {
      notify(detalleDeError(e, errorPorDefecto), "error");
      return null;
    } finally {
      setOcupado(false);
    }
  };

  const guardar = async () => {
    const res = await ejecutar(
      () => guardarFacturaRefact(lote.id, { tipo_factura: (tipo || null) as TipoFacturaRefact | null, nro_factura: nroLimpio || null }),
      "No se pudo guardar la factura.",
    );
    if (!res) return;
    onLote(res);
    notify(nroLimpio ? "Factura guardada." : "Factura quitada.");
    for (const aviso of res.advertencias ?? []) notify(aviso, "warning");
  };

  const elegirArchivo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const archivo = e.target.files?.[0];
    e.target.value = ""; // permite volver a elegir el mismo archivo
    if (!archivo) return;
    const nombre = archivo.name.toLowerCase();
    if (!EXTENSIONES.some((x) => nombre.endsWith(x))) return notify("Sólo se aceptan archivos PDF, JPG o PNG.", "error");
    if (archivo.size === 0) return notify(`«${archivo.name}» está vacío.`, "error");
    if (archivo.size > MAX_MB * 1024 * 1024) return notify(`«${archivo.name}» supera los ${MAX_MB} MB.`, "error");
    const res = await ejecutar(() => subirDocumentoRefact(lote.id, archivo), "No se pudo subir el archivo.");
    if (res) {
      onLote(res);
      notify("Archivo guardado.");
    }
  };

  const quitarArchivo = async () => {
    const res = await ejecutar(() => quitarDocumentoRefact(lote.id), "No se pudo quitar el archivo.");
    if (res) {
      onLote(res);
      notify("Archivo quitado.");
    }
  };

  const verArchivo = () =>
    abrirAdjunto(lote.refact_documento_url).catch((e: Error) => notify(e.message, "error"));

  return (
    <Caja titulo="Factura de la refacturación">
      <div className={styles.fila}>
        <div className={styles.izquierda}>
          <label className={`${lq.campo} ${styles.tipo}`}>
            <span className={lq.rotulo}>Tipo</span>
            <select
              className={lq.select}
              value={tipo}
              disabled={soloLectura || ocupado}
              onChange={(e) => setTipo(e.target.value)}
            >
              <option value="">—</option>
              <option value="A">A</option>
              <option value="B">B</option>
              <option value="C">C</option>
            </select>
          </label>
          <label className={`${lq.campo} ${styles.numero}`}>
            <span className={lq.rotulo}>Número</span>
            <input
              className={lq.input}
              type="text"
              maxLength={20}
              placeholder="00032-00000172"
              autoComplete="off"
              value={nro}
              disabled={soloLectura || ocupado}
              onChange={(e) => setNro(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && cambio && !incompleto) guardar();
              }}
            />
          </label>
          {!soloLectura && (
            <Button variant="primary" size="md" onClick={guardar} disabled={ocupado || !cambio || incompleto}>
              Guardar
            </Button>
          )}
        </div>

        <div className={styles.derecha}>
          <span className={lq.rotulo}>Archivo (PDF, JPG o PNG, hasta {MAX_MB} MB)</span>
          <div className={styles.archivo}>
            {tieneArchivo ? (
              <>
                <BotonPlano type="button" className={`${lq.enlace} ${styles.nombre}`} onClick={verArchivo} title="Abrir el archivo">
                  <Paperclip size={14} aria-hidden="true" />
                  <span>{lote.refact_documento_nombre ?? "Ver archivo"}</span>
                </BotonPlano>
                {!soloLectura && (
                  <>
                    <span className={styles.punto} aria-hidden="true">·</span>
                    <BotonPlano type="button" className={lq.enlace} onClick={() => refArchivo.current?.click()} disabled={ocupado}>
                      Reemplazar
                    </BotonPlano>
                    <span className={styles.punto} aria-hidden="true">·</span>
                    <BotonPlano type="button" className={lq.enlace} onClick={quitarArchivo} disabled={ocupado}>
                      Quitar
                    </BotonPlano>
                  </>
                )}
              </>
            ) : soloLectura ? (
              <span className={lq.tenue}>Sin archivo</span>
            ) : (
              <Button
                variant="ghost"
                size="md"
                leftIcon={<FileUp size={18} aria-hidden="true" />}
                onClick={() => refArchivo.current?.click()}
                disabled={ocupado}
              >
                Subir archivo
              </Button>
            )}
            <input ref={refArchivo} type="file" accept=".pdf,.jpg,.jpeg,.png" hidden onChange={elegirArchivo} />
          </div>
        </div>
      </div>
      {incompleto && !soloLectura && (
        <span className={lq.tenue}>Cargá el tipo y el número juntos (o dejá los dos vacíos).</span>
      )}
      {soloLectura && (
        <span className={lq.tenue}>El lote ya está aplicado en un pago cerrado: la factura no se puede cambiar.</span>
      )}
    </Caja>
  );
};

export default FacturaRefacturacion;
