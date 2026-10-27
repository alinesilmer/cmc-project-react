import type { CamposEdicion } from "./camposEdicion";
import type { DoctorProfileX, SeccionDatos } from "./legajo.types";
import type { Reportar } from "./reportar";
import type { TituloSeccion } from "./tituloSeccion";

export type SeccionProps = {
  data: DoctorProfileX;
  readOnly: boolean;
  isEditing: boolean;
  campos: CamposEdicion;
  reportar: Reportar;
  tituloSeccion: TituloSeccion;
  seccionAbierta: (s: SeccionDatos) => boolean;
};
