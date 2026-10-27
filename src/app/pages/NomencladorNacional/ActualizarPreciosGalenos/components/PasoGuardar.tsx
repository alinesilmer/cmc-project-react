import { Save } from "lucide-react";

import Paso from "@/app/components/ui/Paso/Paso";
import Aviso from "@/app/components/ui/Aviso/Aviso";
import Button from "@/app/components/ui/Button/Button";
import CampoFecha from "@/app/components/ui/CampoFecha/CampoFecha";
import Dialogo, { DialogoAviso, DialogoDatos } from "@/app/components/ui/Dialogo/Dialogo";
import ListaCambios from "@/app/components/ui/ListaCambios/ListaCambios";
import c from "@/app/components/ui/Paso/Campos.module.scss";
import type { EdicionPrecios } from "../useEdicionPrecios";
import { formatFecha } from "@/app/shared/lib/fechas";

type Props = {
  ed: EdicionPrecios;
  obraNombre: string;
  alDescartar: () => void;
};

/** Paso «Vigencia y guardado»: desde cuándo rigen los valores nuevos y el botón que los guarda todos juntos. */
export default function PasoGuardar({ ed, obraNombre, alDescartar }: Props) {
  return (
    <Paso numero={3} titulo="Vigencia y guardado">
      <div className={c.campo}>
        <label className={c.rotulo} htmlFor="vigencia-galenos">Vigente desde</label>
        <CampoFecha value={ed.vigencia} onChange={ed.setVigencia} id="vigencia-galenos" />
      </div>

      {ed.avisoFecha && <Aviso>{ed.avisoFecha}</Aviso>}

      <div className={c.acciones}>
        <Button
          leftIcon={<Save size={16} aria-hidden="true" />}
          disabled={ed.pendientes === 0 || !ed.vigencia}
          isLoading={ed.guardando}
          onClick={ed.pedirConfirmacion}
        >
          {ed.pendientes > 0 ? `Guardar (${ed.pendientes})` : "Guardar cambios"}
        </Button>
        <Button
          variant="ghost"
          disabled={ed.guardando || (ed.pendientes === 0 && ed.resultados.length === 0)}
          onClick={() => {
            ed.descartar();
            alDescartar();
          }}
        >
          Descartar y recargar
        </Button>
      </div>

      {ed.resultados.length > 0 && (
        <ListaCambios
          filas={ed.resultados.map((r) => ({
            clave: r.codigo,
            tono: r.ok ? "nuevo" : "error",
            titulo: r.nombre,
            detalle: r.ok ? (r.msg ?? "actualizado correctamente") : r.msg,
          }))}
        />
      )}

      {ed.confirmando && (
        <Dialogo
          titulo="Confirmar actualización"
          icono={Save}
          onClose={ed.guardando ? undefined : ed.cancelar}
          acciones={
            <>
              <Button variant="ghost" onClick={ed.cancelar} disabled={ed.guardando}>
                Cancelar
              </Button>
              <Button onClick={ed.guardar} isLoading={ed.guardando}>
                Actualizar
              </Button>
            </>
          }
        >
          <DialogoDatos
            filas={[
              { rotulo: "Obra social", valor: obraNombre },
              { rotulo: "Galenos", valor: ed.pendientes },
              { rotulo: "Vigencia", valor: formatFecha(ed.vigencia) },
            ]}
          />
          <DialogoAviso>
            {ed.avisoFecha ?? "Se crean valores nuevos y el historial de los anteriores se mantiene."}
          </DialogoAviso>
        </Dialogo>
      )}
    </Paso>
  );
}
