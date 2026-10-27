import { useMemo } from "react";
import { ListPlus, Search } from "lucide-react";

import InformeAlta from "./components/InformeAlta";
import ListaObrasSociales from "./components/ListaObrasSociales";
import { useAgregarCodigo } from "./useAgregarCodigo";
import { useObrasSociales } from "../../ObrasSociales/useObrasSociales";
import PaginaPasos from "@/app/components/layout/PaginaPasos/PaginaPasos";
import AppSearchSelect from "@/app/components/ui/AppSearchSelect/AppSearchSelect";
import Button from "@/app/components/ui/Button/Button";
import CampoFecha from "@/app/components/ui/CampoFecha/CampoFecha";
import Cargando from "@/app/components/ui/Cargando/Cargando";
import Dialogo, { DialogoAviso, DialogoDatos } from "@/app/components/ui/Dialogo/Dialogo";
import Paso from "@/app/components/ui/Paso/Paso";
import c from "@/app/components/ui/Paso/Campos.module.scss";
import { ErrorAccion } from "@/app/components/ui/ResultadoAccion/ResultadoAccion";
import { fechaAR } from "../utiles";
import { formatoNumero } from "@/app/shared/lib/formatos";

/** Herramientas → «Agregar código a obras sociales»: da de alta un código como NE en $0 en varias obras sociales a la vez. */
export default function AgregarCodigoObrasSociales() {
  const osQuery = useObrasSociales();
  const h = useAgregarCodigo();

  const obras = useMemo(
    () => [...(osQuery.data ?? [])].sort((a, b) => a.nro_obra_social - b.nro_obra_social),
    [osQuery.data],
  );
  const opcionesCodigo = useMemo(
    () => h.codigoOpts.map((n) => ({ id: n.id, label: n.descripcion ? `${n.codigo} · ${n.descripcion}` : n.codigo })),
    [h.codigoOpts],
  );
  const aplicando = h.cargando === "aplicar";
  const conAltas = h.preview?.obras_sociales.filter((o) => o.estado === "creada").length ?? 0;

  return (
    <PaginaPasos titulo="Agregar código a obras sociales" icono={ListPlus}>
      <Paso numero={1} titulo="Código y vigencia">
        <div className={c.campo}>
          <span className={c.rotulo}>Código</span>
          <AppSearchSelect
            options={opcionesCodigo}
            value={h.codigo?.id ?? null}
            loading={h.buscando}
            disabled={aplicando}
            onQueryChange={h.buscarCodigo}
            onChange={h.elegirCodigo}
          />
        </div>
        <div className={c.campo}>
          <label className={c.rotulo} htmlFor="vigencia-alta">Vigencia desde</label>
          <CampoFecha value={h.vigencia} onChange={h.setVigencia} id="vigencia-alta" disabled={aplicando} />
          <p className={c.ayuda}>
            Se crea un NE en $0 por cada especialidad de la plantilla del código (o uno sin especialidad). Lo que ya tienen no se
            toca. Después cargá el precio en Por obra social.
          </p>
        </div>
      </Paso>

      <Paso numero={2} titulo="Obras sociales">
        <ListaObrasSociales
          obras={obras}
          cargando={osQuery.isLoading}
          elegidas={h.elegidas}
          onAlternar={h.alternar}
          onSumar={h.sumar}
          onQuitar={h.quitar}
          bloqueada={aplicando}
        />
        <div className={c.acciones}>
          <Button
            leftIcon={h.cargando === "preview" ? <Cargando size={16} /> : <Search size={16} aria-hidden="true" />}
            disabled={!h.listo || h.cargando !== null}
            onClick={h.revisar}
          >
            Revisar
          </Button>
        </div>
        {aplicando && (
          <p className={c.ayuda}>
            <Cargando size={14} /> Agregando el código… no cierres la página.
          </p>
        )}
        {h.error && <ErrorAccion>{h.error}</ErrorAccion>}
      </Paso>

      {h.informe && (
        <InformeAlta informe={h.informe} guardado={!!h.resultado} ocupado={h.cargando !== null} onAgregar={h.pedirConfirmacion} />
      )}

      {h.confirmando && h.preview && (
        <Dialogo
          titulo="Agregar código"
          icono={ListPlus}
          onClose={aplicando ? undefined : h.cancelar}
          acciones={
            <>
              <Button variant="ghost" onClick={h.cancelar} disabled={aplicando}>
                Cancelar
              </Button>
              <Button onClick={h.aplicar} isLoading={aplicando}>
                Agregar
              </Button>
            </>
          }
        >
          <DialogoDatos
            filas={[
              { rotulo: "Código", valor: h.preview.codigo },
              { rotulo: "Vigencia", valor: fechaAR(h.preview.vigencia_desde) },
              { rotulo: "Valores NE en $0", valor: formatoNumero.format(h.preview.total_creadas) },
              { rotulo: "Obras sociales", valor: conAltas },
            ]}
          />
          <DialogoAviso>Lo que ya existe no se toca.</DialogoAviso>
        </Dialogo>
      )}
    </PaginaPasos>
  );
}
