import { History, Trash2 } from "lucide-react";

import VerPdf from "./VerPdf";
import s from "./HistorialValores.module.scss";
import BotonAccion from "@/app/components/ui/BotonAccion/BotonAccion";
import Paso from "@/app/components/ui/Paso/Paso";
import c from "@/app/components/ui/Paso/Campos.module.scss";
import Tabla from "@/app/components/ui/Tabla/Tabla";
import { formatearFecha } from "@/website/lib/fechas";
import { nombreDeRuta } from "@/website/lib/documentos";
import type { ValoresEticosOut } from "./valoresEticos.api";

type Props = {
  historial: ValoresEticosOut[];
  borrando: number | null;
  onBorrar: (id: number) => void;
  onError: (mensaje: string) => void;
};

/** Las versiones anteriores del PDF, una fila por archivo. */
export default function HistorialValores({ historial, borrando, onBorrar, onError }: Props) {
  return (
    <Paso icono={History} titulo={`Historial (${historial.length})`}>
      {historial.length === 0 ? (
        <p className={c.ayuda}>Sin registros anteriores.</p>
      ) : (
        <div className={s.envoltorio}>
          <Tabla>
            <thead>
              <tr>
                <th>Archivo</th>
                <th>Fecha</th>
                <th>Observaciones</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {historial.map((item) => (
                <tr key={item.id}>
                  <td className={s.archivo}>{nombreDeRuta(item.pdf_path)}</td>
                  <td className={s.fecha}>{formatearFecha(item.fecha_update, "conHora")}</td>
                  <td>{item.observaciones ?? "—"}</td>
                  <td>
                    <div className={s.acciones}>
                      <VerPdf ruta={item.pdf_path} etiqueta="Ver" onError={onError} compacto />
                      <BotonAccion icono={Trash2} etiqueta="Eliminar" peligro disabled={borrando === item.id} onClick={() => onBorrar(item.id)} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </Tabla>
        </div>
      )}
    </Paso>
  );
}
