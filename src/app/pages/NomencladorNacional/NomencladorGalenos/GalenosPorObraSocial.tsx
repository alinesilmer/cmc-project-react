import styles from "./NomencladorGalenos.module.scss";
import { Building2, Clock, Download, Pencil, Plus, RefreshCw, Trash2 } from "lucide-react";
import BotonAccion from "@/app/components/ui/BotonAccion/BotonAccion";
import Button from "@/app/components/ui/Button/Button";
import Cargando from "@/app/components/ui/Cargando/Cargando";
import PanelObrasSociales from "@/app/components/ui/PanelObrasSociales/PanelObrasSociales";
import Tabla from "@/app/components/ui/Tabla/Tabla";
import { formatoPesos } from "@/app/shared/lib/formatos";
import { fmtUnidad, parseMonto } from "./galenos.helpers";
import type { GalenosCtx } from "./useGalenos";

export default function GalenosPorObraSocial({ ctx }: { ctx: GalenosCtx }) {
  const { selectedOsNro, setSelectedOsNro, osList, osGalenos, loadingOs, toggling, loadOsGalenos, osGalenosOrdenados, selectedOsName, openCreate, openImport, openEdit, openHistorial, handleToggleOs } = ctx;

  return (
    <div className={styles.layout}>
      <PanelObrasSociales obras={osList} elegida={selectedOsNro} onElegir={setSelectedOsNro} />

      <section className={styles.contenido}>
        <div className={styles.cabContenido}>
          <h2 className={styles.tituloOs}>
            {selectedOsNro ? selectedOsName : "Galenos"}
            {selectedOsNro && <span className={styles.cuenta}>{osGalenos.length}</span>}
          </h2>
          <div className={styles.acciones}>
            {selectedOsNro && (
              <BotonAccion
                icono={RefreshCw}
                etiqueta="Recargar"
                onClick={() => void loadOsGalenos(selectedOsNro)}
              />
            )}
            {selectedOsNro && (
              <Button variant="ghost" leftIcon={<Download size={16} aria-hidden="true" />} onClick={openImport}>
                Importar de otra OS
              </Button>
            )}
            <Button leftIcon={<Plus size={16} aria-hidden="true" />} onClick={openCreate}>
              Nuevo galeno
            </Button>
          </div>
        </div>

        {!selectedOsNro ? (
          <div className={styles.vacio}>
            <Building2 size={36} className={styles.noSelectionIcon} />
            <p>Elegí una obra social</p>
          </div>
        ) : loadingOs ? (
          <div className={styles.vacio}>
            <Cargando size={18} />
          </div>
        ) : osGalenos.length === 0 ? (
          <div className={styles.vacio}>
            <p>Esta obra social no tiene galenos activos.</p>
          </div>
        ) : (
          <div className={styles.tarjeta}>
            <Tabla>
              <thead>
                <tr>
                  <th>Código</th>
                  <th>Nombre</th>
                  <th>Nivel</th>
                  <th>Valor</th>
                  <th>Hon.</th>
                  <th>Ayu.</th>
                  <th>Gas.</th>
                  <th>Vigencia</th>
                  <th aria-label="Acciones" />
                </tr>
              </thead>
              <tbody>
                {osGalenosOrdenados.map((g) => (
                  <tr key={g.id}>
                    <td className={styles.codigo}>{g.codigo}</td>
                    <td>{g.nombre}</td>
                    <td className={styles.metaCell}>{g.nivel ?? "—"}</td>
                    <td className={styles.priceCell}>{formatoPesos.format(parseMonto(g.valor_unitario) ?? 0)}</td>
                    <td className={styles.unitCell}>{fmtUnidad(g.unidades_honorarios)}</td>
                    <td className={styles.unitCell}>{fmtUnidad(g.unidades_ayudante)}</td>
                    <td className={styles.unitCell}>{fmtUnidad(g.unidades_gastos)}</td>
                    <td className={styles.metaCell}>{g.vigencia_desde}</td>
                    <td>
                      <div className={styles.actionsCell}>
                        <BotonAccion icono={Pencil} etiqueta="Editar" onClick={() => openEdit(g)} />
                        <BotonAccion icono={Clock} etiqueta="Historial" onClick={() => openHistorial(g)} />
                        <BotonAccion
                          icono={Trash2}
                          etiqueta="Desactivar"
                          peligro
                          disabled={toggling === g.id}
                          onClick={() => handleToggleOs(g)}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Tabla>
          </div>
        )}
      </section>
    </div>
  );
}
