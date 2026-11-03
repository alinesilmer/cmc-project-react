import { Plus, Trash2 } from "lucide-react";
import AppSearchSelect from "@/app/components/ui/AppSearchSelect/AppSearchSelect";
import Button from "@/app/components/ui/Button/Button";
import Tabla from "@/app/components/ui/Tabla/Tabla";
import styles from "../DoctorProfilePage.module.scss";
import PagadorSelect from "./PagadorSelect";
import ImportePropio from "./ImportePropio";
import { textoDelConcepto } from "./legajo.helpers";
import type { LegajoConceptos } from "./useLegajoConceptos";
import BotonPlano from "@/app/components/ui/BotonPlano/BotonPlano";

export default function TabConceptos({ conceptos }: { conceptos: LegajoConceptos }) {
  const { sociosDescuento, sdLoading, sdError, conceptOptions, patchingId, deletingId, newRowOpen, setNewRowOpen, newConceptId, setNewConceptId, newPagadorId, setNewPagadorId, setNewImporte, savingNew, handlePatchSocioDescuento, handleSaveImportePropio, handleSaveMultiplicador, handleDeleteSocioDescuento, handleSaveNewSocioDescuento } = conceptos;

  return (
    <>
        <div className={styles.conceptsHeader}>
          <h5 className={styles.section}>Conceptos asignados</h5>
          {!newRowOpen && (
            <Button
              variant="primary"
              onClick={() => {
                setNewRowOpen(true);
                setNewConceptId(null);
                setNewPagadorId(null);
                setNewImporte(null);
              }}
            >
              <Plus size={16} />
              &nbsp;Agregar
            </Button>
          )}
        </div>

        {sdLoading && <p className={styles.muted}>Cargando conceptos…</p>}
        {sdError && <p className={styles.errorInline}>{sdError}</p>}

        {!sdLoading && !sdError && (
          <div className={styles.tableWrap}>
            <Tabla className={styles.table}>
              <thead>
                <tr>
                  <th style={{ width: "32%" }}>Concepto</th>
                  <th style={{ width: "28%" }}>Importe propio</th>
                  <th style={{ width: "32%" }}>Pagador</th>
                  <th style={{ width: 120 }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {newRowOpen && (
                  <tr>
                    <td>
                      <AppSearchSelect
                        options={conceptOptions}
                        value={newConceptId}
                        onChange={(v) => setNewConceptId(v as number | null)}
                      />
                    </td>
                    <td>
                      <ImportePropio onCambio={setNewImporte} />
                    </td>
                    <td>
                      <PagadorSelect
                        value={newPagadorId}
                        onChange={(v) => setNewPagadorId(v)}
                      />
                    </td>
                    <td>
                      <div style={{ display: "flex", gap: 6 }}>
                        <Button
                          variant="primary"
                          disabled={!newConceptId || savingNew}
                          onClick={handleSaveNewSocioDescuento}
                        >
                          {savingNew ? "Guardando…" : "Guardar"}
                        </Button>
                        <Button
                          variant="ghost"
                          onClick={() => {
                            setNewRowOpen(false);
                            setNewConceptId(null);
                            setNewPagadorId(null);
                            setNewImporte(null);
                          }}
                        >
                          Cancelar
                        </Button>
                      </div>
                    </td>
                  </tr>
                )}
                {sociosDescuento.length === 0 && !newRowOpen ? (
                  <tr>
                    <td colSpan={4} className={styles.mutedCenter}>
                      Sin conceptos asignados.
                    </td>
                  </tr>
                ) : (
                  sociosDescuento.map((sd) => (
                    <tr key={sd.id}>
                      <td style={{ minWidth: 200 }}>
                        <AppSearchSelect
                          options={conceptOptions}
                          value={sd.descuento_id}
                          disabled={patchingId === sd.id}
                          onChange={(v) => {
                            if (v != null && Number(v) !== sd.descuento_id) {
                              handlePatchSocioDescuento(sd.id, "descuento_id", Number(v));
                            }
                          }}
                        />
                      </td>
                      <td style={{ minWidth: 220 }}>
                        <ImportePropio
                          porcentajePropio={sd.porcentaje_propio}
                          montoPropio={sd.monto_propio}
                          delConcepto={textoDelConcepto(sd.descuento_precio, sd.descuento_porcentaje)}
                          disabled={patchingId === sd.id}
                          onGuardar={(v) => handleSaveImportePropio(sd.id, v)}
                        />
                        {sd.porcentaje_propio == null && (sd.descuento_porcentaje ?? 0) === 0 && (
                          <label className={styles.muted} style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4 }}>
                            Veces por período
                            <input
                              key={`${sd.id}-${sd.multiplicador}`}
                              type="number"
                              min={1}
                              max={12}
                              defaultValue={sd.multiplicador ?? 1}
                              disabled={patchingId === sd.id}
                              style={{ width: 56 }}
                              onBlur={(e) => {
                                const n = Math.trunc(Number(e.target.value));
                                if (n >= 1 && n <= 12 && n !== (sd.multiplicador ?? 1)) handleSaveMultiplicador(sd.id, n);
                                else e.target.value = String(sd.multiplicador ?? 1);
                              }}
                            />
                          </label>
                        )}
                      </td>
                      <td style={{ minWidth: 200 }}>
                        <PagadorSelect
                          value={sd.pagador_medico_id}
                          disabled={patchingId === sd.id}
                          onChange={(v) => {
                            if (v !== sd.pagador_medico_id) {
                              handlePatchSocioDescuento(sd.id, "pagador_medico_id", v);
                            }
                          }}
                        />
                      </td>
                      <td>
                        <BotonPlano
                          className={styles.iconButton}
                          title="Eliminar"
                          disabled={deletingId === sd.id}
                          onClick={() => handleDeleteSocioDescuento(sd.id)}
                        >
                          <Trash2 size={15} />
                        </BotonPlano>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </Tabla>
          </div>
        )}
    </>
  );
}
