import React, { useMemo, useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import ClinicaAutocomplete from "../../components/ClinicaAutocomplete";
import AltaClinicaModal from "../../components/AltaClinicaModal";
import ConfirmActionModal from "../../components/ConfirmActionModal";
import { mensajeDeError } from "@/app/shared/lib/httpErrors";
import { eliminarClinica } from "../../api";
import type { ClinicaOption } from "../../types";
import styles from "../CargaFacturacion.module.scss";

interface Props {
  codClinica: number | null;
  /** Nombre resuelto en vivo: hint de edición (antes "clinicaPreset") y, ahora
   *  también, el nombre de lo que el operador acaba de elegir/crear en modo alta. */
  clinicaNombre: string | null;
  onClinicaChange: (cod: number | null, clinica: ClinicaOption | null) => void;
  /** Para que el padre saque la clínica borrada de `clinicasPrecargadas`. */
  onClinicaDeleted?: (cod: number) => void;
  disabled?: boolean;
  clinicasPrecargadas?: ClinicaOption[] | null;
  /** Reset "externo" (reset de formulario completo / payee pasa a organización) —
   *  viene del padre, se combina con el reset local post-borrado. */
  resetKey: number;
}

const ClinicaSection: React.FC<Props> = ({
  codClinica, clinicaNombre, onClinicaChange, onClinicaDeleted, disabled,
  clinicasPrecargadas, resetKey,
}) => {
  const [modal, setModal] = useState<"alta" | "editar" | null>(null);
  const [showBaja, setShowBaja] = useState(false);
  const [borrando, setBorrando] = useState(false);
  const [bajaError, setBajaError] = useState<string | null>(null);
  // El autocomplete conserva el texto tipeado aunque el `value` vuelva a null (ver
  // AppSearchSelect): tras borrar la clínica hay que remontarlo para que el campo
  // quede realmente vacío y no muestre a algo que ya no existe.
  const [autocompleteKey, setAutocompleteKey] = useState(0);

  const puedeBorrar = Boolean(codClinica && clinicaNombre) && !disabled;
  // Estable mientras el modal está abierto (si no, recargaría el campo en cada render).
  const aEditar = useMemo(
    () => (modal === "editar" && codClinica != null && clinicaNombre
      ? { cod: codClinica, nombre: clinicaNombre }
      : null),
    [modal, codClinica, clinicaNombre],
  );

  const handleEliminar = async () => {
    if (codClinica == null) return;
    setBorrando(true);
    setBajaError(null);
    try {
      await eliminarClinica(codClinica);
      setShowBaja(false);
      onClinicaChange(null, null);
      onClinicaDeleted?.(codClinica);
      setAutocompleteKey((k) => k + 1);
    } catch (e) {
      // Se cierra el modal para que el motivo (típicamente el 409 "tiene N
      // prestaciones cargadas") quede visible bajo el campo y no tapado.
      setShowBaja(false);
      setBajaError(mensajeDeError(e, "No se pudo eliminar la clínica."));
    } finally {
      setBorrando(false);
    }
  };

  return (
    <div className={styles.section}>
      <span className={styles.sectionTitle}>Clínica</span>
      <div className={styles.filterField}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <ClinicaAutocomplete
              key={`clinica-${resetKey}-${autocompleteKey}`}
              value={codClinica}
              onChange={onClinicaChange}
              disabled={disabled}
              presetLabel={clinicaNombre ?? undefined}
              blurOnSelect={false}
              clinicasPrecargadas={clinicasPrecargadas ?? undefined}
            />
          </div>
          <button
            type="button"
            className={styles.btnIcon}
            onClick={() => setModal("editar")}
            disabled={!puedeBorrar}
            title={puedeBorrar ? `Editar ${clinicaNombre}` : "Elegí una clínica del padrón para poder editarla"}
            aria-label="Editar clínica"
          >
            <Pencil size={15} />
          </button>
          <button
            type="button"
            className={styles.btnIconDanger}
            onClick={() => { setBajaError(null); setShowBaja(true); }}
            disabled={!puedeBorrar}
            title={
              puedeBorrar
                ? `Eliminar del padrón a ${clinicaNombre}`
                : "Elegí una clínica del padrón para poder eliminarla"
            }
            aria-label="Eliminar clínica del padrón"
          >
            <Trash2 size={16} />
          </button>
          <button type="button" className={styles.btnGhost} onClick={() => setModal("alta")} disabled={disabled}>
            + Agregar clínica
          </button>
        </div>
        {/* Una clínica recién creada/elegida por este camino (no por click directo en
         *  una opción del dropdown) puede no reflejarse en el texto del combobox — ver
         *  el mismo patrón en PacienteSection. Este chip es la confirmación visible. */}
        {clinicaNombre && (
          <span style={{ fontSize: 12, color: "#1d9148", fontWeight: 600 }}>✓ {clinicaNombre}</span>
        )}
        {bajaError && <span className={styles.errorText}>{bajaError}</span>}
      </div>

      <AltaClinicaModal
        isOpen={modal !== null}
        clinica={aEditar}
        onClose={() => setModal(null)}
        onCreated={(clinica) => {
          setModal(null);
          onClinicaChange(clinica.cod, clinica);
          // El combobox guarda el texto que tenía: se remonta para que muestre el nuevo.
          setAutocompleteKey((k) => k + 1);
        }}
      />

      <ConfirmActionModal
        isOpen={showBaja}
        icon={Trash2}
        variant="danger"
        title="Eliminar clínica"
        message={
          <>
            Se va a borrar del padrón a <strong>{clinicaNombre}</strong>.
          </>
        }
        warning="Si la clínica ya tiene prestaciones cargadas (no anuladas), el sistema no va a permitir eliminarla."
        confirmLabel="Eliminar clínica"
        loading={borrando}
        onClose={() => { if (!borrando) setShowBaja(false); }}
        onConfirm={handleEliminar}
      />
    </div>
  );
};

export default ClinicaSection;
