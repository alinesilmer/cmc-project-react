import React, { useState } from "react";
import { Trash2 } from "lucide-react";
import AfiliadoAutocomplete from "../../components/AfiliadoAutocomplete";
import AltaAfiliadoModal from "../../components/AltaAfiliadoModal";
import ConfirmActionModal from "../../components/ConfirmActionModal";
import { eliminarAfiliado } from "../../api";
import type { AfiliadoRead } from "../../types";
import styles from "../CargaFacturacion.module.scss";

interface Props {
  dni: string;
  nombrePaciente: string;
  onDniChange: (dni: string) => void;
  onAfiliadoFound: (afiliado: AfiliadoRead) => void;
  disabled?: boolean;
  error?: string | null;
}

const PacienteSection: React.FC<Props> = ({
  dni, nombrePaciente, onDniChange, onAfiliadoFound, disabled, error,
}) => {
  const [showAlta, setShowAlta] = useState(false);
  const [showBaja, setShowBaja] = useState(false);
  const [borrando, setBorrando] = useState(false);
  const [bajaError, setBajaError] = useState<string | null>(null);
  // El autocomplete conserva el texto tipeado aunque el `value` vuelva a null
  // (ver AppSearchSelect): tras borrar el afiliado hay que remontarlo para que el
  // campo quede realmente vacío y no muestre a alguien que ya no existe.
  const [autocompleteKey, setAutocompleteKey] = useState(0);

  const handleAfiliadoChange = (nuevoDni: string | null, afiliado: AfiliadoRead | null) => {
    onDniChange(nuevoDni ?? "");
    if (afiliado) onAfiliadoFound(afiliado);
  };

  // Solo se puede borrar lo que está efectivamente seleccionado del padrón: el
  // nombre resuelto es la señal de que el identificador salió de un afiliado real
  // y no de algo a medio tipear.
  const puedeBorrar = Boolean(dni && nombrePaciente) && !disabled;

  const handleEliminar = async () => {
    setBorrando(true);
    setBajaError(null);
    try {
      await eliminarAfiliado(dni);
      setShowBaja(false);
      onDniChange("");           // limpia también el nombre (efecto en CargaFacturacion)
      setAutocompleteKey((k) => k + 1);
    } catch (e: any) {
      const detail = e?.response?.data?.detail;
      // Se cierra el modal para que el motivo (típicamente el 409 "tiene N
      // prestaciones cargadas") quede visible bajo el campo y no tapado.
      setShowBaja(false);
      setBajaError(typeof detail === "string" ? detail : "No se pudo eliminar el afiliado.");
    } finally {
      setBorrando(false);
    }
  };

  return (
    <div className={styles.section}>
      <span className={styles.sectionTitle}>
        Paciente / afiliado <span className={styles.sectionHint}>(opcional)</span>
      </span>
      <div className={styles.fieldsRow}>
        <div className={`${styles.filterField} ${styles.filterFieldWide}`} data-field="paciente">
          {/* El identificador puede ser el DNI o el nro de afiliado de la OS. */}
          <label className={styles.filterLabel}>Paciente (nombre, DNI o nro de afiliado)</label>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <AfiliadoAutocomplete
                key={autocompleteKey}
                value={dni || null}
                onChange={handleAfiliadoChange}
                disabled={disabled}
                presetLabel={nombrePaciente || undefined}
                blurOnSelect={false}
              />
            </div>
            <button
              type="button"
              className={styles.btnIconDanger}
              onClick={() => { setBajaError(null); setShowBaja(true); }}
              disabled={!puedeBorrar}
              title={
                puedeBorrar
                  ? `Eliminar del padrón a ${nombrePaciente}`
                  : "Elegí un afiliado del padrón para poder eliminarlo"
              }
              aria-label="Eliminar afiliado del padrón"
            >
              <Trash2 size={16} />
            </button>
            <button type="button" className={styles.btnGhost} onClick={() => setShowAlta(true)} disabled={disabled}>
              + Agregar afiliado
            </button>
          </div>
          {nombrePaciente && (
            <span style={{ fontSize: 12, color: "#1d9148", fontWeight: 600 }}>✓ {nombrePaciente}</span>
          )}
          {error && <span className={styles.errorText}>{error}</span>}
          {bajaError && <span className={styles.errorText}>{bajaError}</span>}
        </div>
      </div>

      <AltaAfiliadoModal
        isOpen={showAlta}
        dni={dni}
        onClose={() => setShowAlta(false)}
        onCreated={(afiliado) => {
          setShowAlta(false);
          onAfiliadoFound(afiliado);
        }}
      />

      <ConfirmActionModal
        isOpen={showBaja}
        icon={Trash2}
        variant="danger"
        title="Eliminar afiliado"
        message={
          <>
            Se va a borrar del padrón a <strong>{nombrePaciente}</strong> ({dni}).
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
