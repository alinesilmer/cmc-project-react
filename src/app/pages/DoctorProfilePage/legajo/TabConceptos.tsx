import { Plus, Trash2 } from "lucide-react";
import AppSearchSelect from "@/app/components/ui/AppSearchSelect/AppSearchSelect";
import Button from "@/app/components/ui/Button/Button";
import Tabla from "@/app/components/ui/Tabla/Tabla";
import styles from "../DoctorProfilePage.module.scss";
import PagadorSelect from "./PagadorSelect";
import type { LegajoConceptos } from "./useLegajoConceptos";
import BotonPlano from "@/app/components/ui/BotonPlano/BotonPlano";

export default function TabConceptos({ conceptos }: { conceptos: LegajoConceptos }) {
  const { sociosDescuento, sdLoading, sdError, conceptOptions, patchingId, deletingId, newRowOpen, setNewRowOpen, newConceptId, setNewConceptId, newPagadorId, setNewPagadorId, savingNew, handlePatchSocioDescuento, handleDeleteSocioDescuento, handleSaveNewSocioDescuento } = conceptos;

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
                  <th style={{ width: "40%" }}>Concepto</th>
                  <th style={{ width: "40%" }}>Pagador</th>
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
                    <td colSpan={3} className={styles.mutedCenter}>
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
