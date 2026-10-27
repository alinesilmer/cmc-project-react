import React, { useMemo, useState } from "react";
import { Pencil, Trash2, Check } from "lucide-react";
import AfiliadoAutocomplete from "../../components/AfiliadoAutocomplete";
import { etiquetaAfiliado } from "../../components/etiquetas";
import { mensajeDeError } from "@/app/shared/lib/httpErrors";
import AltaAfiliadoModal from "../../components/AltaAfiliadoModal";
import ConfirmActionModal from "../../components/ConfirmActionModal";
import { eliminarAfiliadoPorId } from "../../api";
import type { AfiliadoRead } from "../../types";
import comun from "../Comun.module.scss";;
import paleta from "@/app/styles/paleta.module.scss";
import BotonPlano from "@/app/components/ui/BotonPlano/BotonPlano";

interface Props {
  /** Afiliado elegido del padrón (por id: puede no tener número). */
  afiliadoId: number | null;
  dni: string;
  nombrePaciente: string;
  /** Elegido, creado o editado (o `null` al vaciar / borrar). */
  onAfiliadoChange: (afiliado: AfiliadoRead | null) => void;
  disabled?: boolean;
  error?: string | null;
}

const PacienteSection: React.FC<Props> = ({
  afiliadoId, dni, nombrePaciente, onAfiliadoChange, disabled, error,
}) => {
  const [modal, setModal] = useState<"alta" | "editar" | null>(null);
  const [showBaja, setShowBaja] = useState(false);
  const [borrando, setBorrando] = useState(false);
  const [bajaError, setBajaError] = useState<string | null>(null);
  // El autocomplete conserva el texto tipeado aunque el `value` vuelva a null (ver AppSearchSelect).
  const [autocompleteKey, setAutocompleteKey] = useState(0);

  const etiqueta = etiquetaAfiliado(dni, nombrePaciente);
  // Estable mientras el modal está abierto: si cambiara en cada render, el modal volvería a cargar sus campos con cada tecla.
  const aEditar = useMemo(
    () => (modal === "editar" && afiliadoId != null
      ? { id: afiliadoId, dni: dni || null, nombre: nombrePaciente || null }
      : null),
    [modal, afiliadoId, dni, nombrePaciente],
  );
  // Editar y borrar, sólo sobre un afiliado elegido del padrón.
  const elegido = afiliadoId != null && !disabled;

  const handleEliminar = async () => {
    if (afiliadoId == null) return;
    setBorrando(true);
    setBajaError(null);
    try {
      await eliminarAfiliadoPorId(afiliadoId);
      setShowBaja(false);
      onAfiliadoChange(null);
      setAutocompleteKey((k) => k + 1);
    } catch (e) {
      // Se cierra el modal para que el motivo (típicamente el 409 "tiene N prestaciones cargadas") quede visible bajo el campo y no tapado.
      setShowBaja(false);
      setBajaError(mensajeDeError(e, "No se pudo eliminar el afiliado."));
    } finally {
      setBorrando(false);
    }
  };

  return (
    <div className={comun.section}>
      <span className={comun.sectionTitle}>
        Paciente / afiliado <span className={comun.sectionHint}>(opcional)</span>
      </span>
      <div className={comun.fieldsRow}>
        <div className={`${comun.filterField} ${comun.filterFieldWide}`} data-field="paciente">
          {/* El identificador puede ser el DNI o el nro de afiliado de la OS. */}
          <label className={comun.filterLabel}>Paciente (nombre, DNI o nro de afiliado)</label>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <AfiliadoAutocomplete
                key={autocompleteKey}
                value={afiliadoId}
                onChange={onAfiliadoChange}
                disabled={disabled}
                presetLabel={etiqueta || undefined}
                blurOnSelect={false}
              />
            </div>
            <BotonPlano
              type="button"
              className={comun.btnIcon}
              onClick={() => setModal("editar")}
              disabled={!elegido}
              title={elegido ? `Editar a ${etiqueta}` : "Elegí un afiliado del padrón para poder editarlo"}
              aria-label="Editar afiliado"
            >
              <Pencil size={15} />
            </BotonPlano>
            <BotonPlano
              type="button"
              className={comun.btnIconDanger}
              onClick={() => { setBajaError(null); setShowBaja(true); }}
              disabled={!elegido}
              title={elegido ? `Eliminar del padrón a ${etiqueta}` : "Elegí un afiliado del padrón para poder eliminarlo"}
              aria-label="Eliminar afiliado del padrón"
            >
              <Trash2 size={16} />
            </BotonPlano>
            <BotonPlano type="button" className={comun.btnGhost} onClick={() => setModal("alta")} disabled={disabled}>
              + Agregar afiliado
            </BotonPlano>
          </div>
          {etiqueta && (
            <span style={{ fontSize: 12, color: paleta.successGreen, fontWeight: 600 }}><Check size={14} style={{ verticalAlign: "-2px" }} aria-hidden="true" /> {etiqueta}</span>
          )}
          {error && <span className={comun.errorText}>{error}</span>}
          {bajaError && <span className={comun.errorText}>{bajaError}</span>}
        </div>
      </div>

      <AltaAfiliadoModal
        isOpen={modal !== null}
        dni={dni}
        afiliado={aEditar}
        onClose={() => setModal(null)}
        onCreated={(afiliado) => {
          setModal(null);
          onAfiliadoChange(afiliado);
          setAutocompleteKey((k) => k + 1);
        }}
      />

      <ConfirmActionModal
        isOpen={showBaja}
        icon={Trash2}
        variant="danger"
        title="Eliminar afiliado"
        message={
          <>
            Se va a borrar del padrón a <strong>{etiqueta}</strong>.
          </>
        }
        warning="Si el afiliado ya tiene prestaciones cargadas (no anuladas), el sistema no va a permitir eliminarlo."
        confirmLabel="Eliminar afiliado"
        loading={borrando}
        onClose={() => { if (!borrando) setShowBaja(false); }}
        onConfirm={handleEliminar}
      />
    </div>
  );
};

export default PacienteSection;
