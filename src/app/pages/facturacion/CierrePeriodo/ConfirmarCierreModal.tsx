import React from "react";
import { FileCheck2 } from "lucide-react";

import Dialogo, { DialogoAviso, DialogoDatos } from "@/app/components/ui/Dialogo/Dialogo";
import Button from "@/app/components/ui/Button/Button";
import type { CierrePreviewResponse } from "../types";
import { formatMoney } from "../money";

interface Props {
  isOpen: boolean;
  preview: CierrePreviewResponse;
  osNombre: string;
  tipoFactura?: string;
  nroFactura?: string;
  archivoNombre?: string | null;
  onClose: () => void;
  onConfirm: () => void;
  loading?: boolean;
}

const ConfirmarCierreModal: React.FC<Props> = ({
  isOpen, preview, osNombre, tipoFactura, nroFactura, archivoNombre, onClose, onConfirm, loading,
}) => {
  if (!isOpen) return null;

  const sinValorizar = preview.sin_valorizar ?? 0;

  return (
    <Dialogo
      titulo="Cerrar el período"
      icono={FileCheck2}
      peligro
      onClose={loading ? undefined : onClose}
      acciones={
        <>
          <Button variant="ghost" onClick={onClose} disabled={loading}>Cancelar</Button>
          <Button variant="danger" onClick={onConfirm} disabled={loading} isLoading={loading}>
            Sí, cerrar
          </Button>
        </>
      }
    >
      <DialogoDatos
        filas={[
          { rotulo: "Obra social", valor: osNombre },
          { rotulo: "Período", valor: preview.periodo },
          { rotulo: "Prestaciones", valor: preview.cantidad },
          { rotulo: "Total", valor: formatMoney(preview.importe_total) },
          ...(tipoFactura ? [{ rotulo: "Tipo de factura", valor: tipoFactura }] : []),
          ...(nroFactura ? [{ rotulo: "Nº de factura", valor: nroFactura }] : []),
          { rotulo: "Documento", valor: archivoNombre ?? "Sin adjuntar" },
        ]}
      />
      {sinValorizar > 0 && <DialogoAviso>{sinValorizar} sin valorizar: quedan en $0 por falta de precio.</DialogoAviso>}
      <DialogoAviso tono="peligro">No se puede deshacer y habilita la liquidación.</DialogoAviso>
    </Dialogo>
  );
};

export default ConfirmarCierreModal;
