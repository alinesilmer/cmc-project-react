import { Pencil } from "lucide-react";
import Button from "@/app/components/ui/Button/Button";
import { usePermisos } from "@/app/auth/usePermisos";
import styles from "../DoctorProfilePage.module.scss";
import { camposEdicion } from "./camposEdicion";
import type { LegajoDatos } from "./useLegajoDatos";
import type { DoctorProfileX } from "./legajo.types";
import type { Reportar } from "./reportar";
import { crearTituloSeccion } from "./tituloSeccion";
import SeccionImpositivos from "./SeccionImpositivos";
import SeccionPersonales from "./SeccionPersonales";
import SeccionProfesionales from "./SeccionProfesionales";
import BotonPlano from "@/app/components/ui/BotonPlano/BotonPlano";

type Props = {
  data: DoctorProfileX;
  readOnly: boolean;
  editaSuLegajo: boolean;
  edicion: LegajoDatos;
  reportar: Reportar;
};

export default function TabDatos({ data, readOnly, editaSuLegajo, edicion, reportar }: Props) {
  const { can } = usePermisos();
  const { isEditing, saving, draft, setField, seccionAbierta, alternarSeccion } = edicion;
  const campos = camposEdicion(draft, setField);
  const tituloSeccion = crearTituloSeccion(seccionAbierta, alternarSeccion);
  const seccion = { data, readOnly, isEditing, campos, reportar, tituloSeccion, seccionAbierta };

  return (
    <>
      {((!readOnly && can("medico:editar")) || editaSuLegajo) && (
        <BotonPlano
          type="button"
          className={styles.editPencil}
          aria-label={isEditing ? "Cancelar edición" : "Editar"}
          title={isEditing ? "Cancelar edición" : "Editar"}
          onClick={edicion.alternarEdicion}
        >
          <Pencil size={16} />
        </BotonPlano>
      )}

      <SeccionPersonales {...seccion} />
      <SeccionProfesionales {...seccion} />
      <SeccionImpositivos {...seccion} />

      {isEditing && (
        <div className={styles.editActions}>
          <Button variant="primary" disabled={saving} onClick={edicion.guardar}>
            {saving ? "Guardando…" : "Guardar cambios"}
          </Button>
          <Button variant="ghost" onClick={edicion.cancelarEdicion}>
            Cancelar
          </Button>
        </div>
      )}
    </>
  );
}
