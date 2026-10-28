import { Modal } from "./ModalGalenos";
import styles from "./NomencladorGalenos.module.scss";
import { AlertCircle, Download, X as XIcon } from "lucide-react";
import CampoFecha from "@/app/components/ui/CampoFecha/CampoFecha";
import { type GalenoOut } from "../nomenclador.types";
import Cargando from "@/app/components/ui/Cargando/Cargando";
import type { GalenosCtx } from "./useGalenos";
import BotonPlano from "@/app/components/ui/BotonPlano/BotonPlano";

export default function ModalImportarGalenos({ ctx }: { ctx: GalenosCtx }) {
  const { setModalKind, selectedOsNro, importForm, setImportForm, importOsSearch, setImportOsSearch, importOsOpen, setImportOsOpen, importing, importResult, importErrors, setImportErrors, importOrigenGalenos, setImportOrigenGalenos, osList, selectedOsName, loadImportOrigenGalenos, handleImport } = ctx;
  return (
    <>
      <Modal
        title="Importar galenos de otra OS"
        subtitle={`Destino: ${selectedOsName}`}
        onClose={() => setModalKind(null)}
        wide
      >
        <div className={styles.formGroup}>
          <label className={styles.formLabel}>
            Obra Social origen <span className={styles.req}>*</span>
          </label>
          {importForm.osOrigen !== "" ? (
            <div className={styles.osAcSelected}>
              <span className={styles.osAcNro}>{importForm.osOrigen}</span>
              <span className={styles.osAcName}>
                {osList.find(
                  (os) => os.nro_obra_social === importForm.osOrigen,
                )?.nombre ?? ""}
              </span>
              <BotonPlano
                type="button"
                className={styles.osAcClear}
                title="Cambiar"
                onClick={() => {
                  setImportForm((p) => ({ ...p, osOrigen: "" }));
                  setImportOsSearch("");
                  setImportOrigenGalenos(null);
                }}
              >
                <XIcon size={13} />
              </BotonPlano>
            </div>
          ) : (
            <div className={styles.osAcWrap}>
              <input
                className={`${styles.formInput} ${importErrors.osOrigen ? styles.inputError : ""}`}
                placeholder="Buscar por nombre o número…"
                value={importOsSearch}
                onChange={(e) => {
                  setImportOsSearch(e.target.value);
                  setImportOsOpen(true);
                }}
                onFocus={() => setImportOsOpen(true)}
                onBlur={() => setTimeout(() => setImportOsOpen(false), 150)}
              />
              {importOsOpen &&
                (() => {
                  const q = importOsSearch.trim().toLowerCase();
                  const list = osList
                    .filter((os) => os.nro_obra_social !== selectedOsNro)
                    .filter(
                      (os) =>
                        !q ||
                        os.nombre.toLowerCase().includes(q) ||
                        String(os.nro_obra_social).includes(q),
                    )
                    .slice(0, 50);
                  return list.length > 0 ? (
                    <ul className={styles.osAcDropdown}>
                      {list.map((os) => (
                        <li
                          key={os.nro_obra_social}
                          className={styles.osAcItem}
                          onMouseDown={(e) => {
                            e.preventDefault();
                            setImportForm((p) => ({
                              ...p,
                              osOrigen: os.nro_obra_social,
                            }));
                            setImportErrors((p) => ({
                              ...p,
                              osOrigen: "",
                            }));
                            setImportOsSearch("");
                            setImportOsOpen(false);
                            loadImportOrigenGalenos(os.nro_obra_social);
                          }}
                        >
                          <span className={styles.osAcNro}>
                            {os.nro_obra_social}
                          </span>
                          <span className={styles.osAcName}>
                            {os.nombre}
                          </span>
                        </li>
                      ))}
                    </ul>
                  ) : null;
                })()}
            </div>
          )}
          {importErrors.osOrigen && (
            <span className={styles.errorMsg}>{importErrors.osOrigen}</span>
          )}
        </div>

        <div className={styles.formGroup}>
          <label className={styles.formLabel}>
            Vigente desde <span className={styles.req}>*</span>
          </label>
          <CampoFecha
            value={importForm.vigencia_desde}
            onChange={(valor) =>
              setImportForm((p) => ({
                ...p,
                vigencia_desde: valor,
              }))
            }
          />
          {importErrors.vigencia_desde && (
            <span className={styles.errorMsg}>
              {importErrors.vigencia_desde}
            </span>
          )}
        </div>

        {/* Alcance de la importación */}
        {(() => {
          const nivelados =
            importOrigenGalenos?.filter((g) => g.nivel != null) ?? null;
          const sinNivel =
            importOrigenGalenos?.filter((g) => g.nivel == null) ?? null;
          const cnt = (list: GalenoOut[] | null, porCodigo = false) =>
            list == null
              ? ""
              : ` (${porCodigo ? new Set(list.map((g) => g.codigo)).size : list.length})`;
          return (
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Qué importar</label>
              <label className={styles.checkRow}>
                <input
                  type="radio"
                  name="importAlcance"
                  className={styles.checkInput}
                  checked={importForm.alcance === "todos"}
                  onChange={() =>
                    setImportForm((p) => ({ ...p, alcance: "todos" }))
                  }
                />
                <span className={styles.checkLabel}>
                  Todos los galenos{cnt(importOrigenGalenos)}
                </span>
              </label>
              <label className={styles.checkRow}>
                <input
                  type="radio"
                  name="importAlcance"
                  className={styles.checkInput}
                  checked={importForm.alcance === "nivelados"}
                  onChange={() =>
                    setImportForm((p) => ({ ...p, alcance: "nivelados" }))
                  }
                />
                <span className={styles.checkLabel}>
                  Solo galenos nivelados{cnt(nivelados, true)}
                </span>
              </label>
              <label className={styles.checkRow}>
                <input
                  type="radio"
                  name="importAlcance"
                  className={styles.checkInput}
                  checked={importForm.alcance === "sin_nivel"}
                  onChange={() =>
                    setImportForm((p) => ({ ...p, alcance: "sin_nivel" }))
                  }
                />
                <span className={styles.checkLabel}>
                  Solo galenos sin nivel{cnt(sinNivel)}
                </span>
              </label>
              {importForm.alcance !== "todos" && (
                <p className={styles.hintText}>
                  Los demás galenos del destino no se tocan (conservan sus
                  valores).
                </p>
              )}
              {importErrors.alcance && (
                <span className={styles.errorMsg}>
                  {importErrors.alcance}
                </span>
              )}
            </div>
          );
        })()}

        {/* Qué actualizar: valor + unidades vs. solo el valor del galeno */}
        <div className={styles.formGroup}>
          <label className={styles.formLabel}>Qué actualizar</label>
          <label className={styles.checkRow}>
            <input
              type="radio"
              name="importActualizar"
              className={styles.checkInput}
              checked={importForm.actualizar === "valor_y_unidades"}
              onChange={() =>
                setImportForm((p) => ({
                  ...p,
                  actualizar: "valor_y_unidades",
                }))
              }
            />
            <span className={styles.checkLabel}>
              Valor del galeno y unidades
            </span>
          </label>
          <label className={styles.checkRow}>
            <input
              type="radio"
              name="importActualizar"
              className={styles.checkInput}
              checked={importForm.actualizar === "solo_valor"}
              onChange={() =>
                setImportForm((p) => ({ ...p, actualizar: "solo_valor" }))
              }
            />
            <span className={styles.checkLabel}>
              Solo el valor del galeno (mantener las unidades del destino)
            </span>
          </label>
          {importForm.actualizar === "solo_valor" && (
            <p className={styles.hintText}>
              Actualiza el valor general del galeno (el que multiplica a
              cada nivel) con el del origen y conserva las unidades de cada
              nivel del destino. Los galenos que el destino todavía no tenga
              se crean con los datos completos del origen.
            </p>
          )}
        </div>

        {/* Conversión sin nivel → nivelado */}
        <div className={styles.formGroup}>
          <label className={styles.checkRow}>
            <input
              type="checkbox"
              className={styles.checkInput}
              checked={importForm.convertir}
              onChange={(e) =>
                setImportForm((p) => ({
                  ...p,
                  convertir: e.target.checked,
                }))
              }
            />
            <span className={styles.checkLabel}>
              Reemplazar galenos sin nivel del destino por los niveles del
              origen
            </span>
          </label>
          <p className={styles.hintText}>
            Si el origen tiene un galeno nivelado y el destino lo tiene sin
            nivel, se cierra el galeno sin nivel del destino, se crean los
            niveles y los valores que lo usaban pasan al galeno de su nivel.
            Sin esta opción esos casos se reportan como error.
          </p>
        </div>

        <p className={styles.hintText}>
          Copia los galenos vigentes del origen (precio + unidades). Si la
          OS destino ya tiene un galeno con ese código/nivel, se rota la
          vigencia.
        </p>

        {importResult && (
          <div className={styles.importResult}>
            <div className={styles.statsGrid}>
              <div className={styles.statBox}>
                <span className={styles.statNum}>
                  {importResult.total_origen}
                </span>
                <span className={styles.statLabel}>Total origen</span>
              </div>
              <div className={`${styles.statBox} ${styles.statCreado}`}>
                <span className={styles.statNum}>
                  {importResult.creados}
                </span>
                <span className={styles.statLabel}>Creados</span>
              </div>
              <div className={`${styles.statBox} ${styles.statRotado}`}>
                <span className={styles.statNum}>
                  {importResult.rotados}
                </span>
                <span className={styles.statLabel}>Rotados</span>
              </div>
              <div className={styles.statBox}>
                <span className={styles.statNum}>
                  {importResult.sin_cambios}
                </span>
                <span className={styles.statLabel}>Sin cambios</span>
              </div>
              {(importResult.convertidos ?? 0) > 0 && (
                <div className={`${styles.statBox} ${styles.statCreado}`}>
                  <span className={styles.statNum}>
                    {importResult.convertidos}
                  </span>
                  <span className={styles.statLabel}>Convertidos</span>
                </div>
              )}
            </div>
            {importResult.errores.some((er) =>
              /sin nivel/i.test(er.motivo),
            ) &&
              !importForm.convertir && (
                <div className={styles.convertBanner}>
                  <AlertCircle size={16} />
                  <div>
                    <p>
                      Algunos galenos del origen son{" "}
                      <strong>nivelados</strong> y el destino los tiene{" "}
                      <strong>sin nivel</strong>. Por eso no se importaron.
                      Para reemplazarlos por los niveles del origen,
                      reintentá con la conversión activada.
                    </p>
                    <BotonPlano
                      className={styles.btnPrimary}
                      onClick={() => handleImport(true)}
                      disabled={importing}
                    >
                      {importing ? (
                        <>
                          <Cargando size={14} />{" "}
                          Reintentando…
                        </>
                      ) : (
                        <>
                          <Download size={14} /> Reintentar convirtiendo a
                          nivelado
                        </>
                      )}
                    </BotonPlano>
                  </div>
                </div>
              )}
            {importResult.errores.length > 0 && (
              <div className={styles.errorList}>
                <p className={styles.errorListTitle}>
                  {importResult.errores.length} error(es):
                </p>
                {importResult.errores.map((err, i) => (
                  <div key={i} className={styles.errorItem}>
                    <AlertCircle size={12} />
                    <span>
                      {err.codigo}
                      {err.nivel != null
                        ? ` (Nivel ${err.nivel})`
                        : ""}: {err.motivo}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div className={styles.modalFooter}>
          <BotonPlano
            className={styles.btnGhost}
            onClick={() => setModalKind(null)}
          >
            {importResult ? "Cerrar" : "Cancelar"}
          </BotonPlano>
          {!importResult && (
            <BotonPlano
              className={styles.btnPrimary}
              onClick={() => handleImport()}
              disabled={importing}
            >
              {importing ? (
                <>
                  <Cargando size={14} /> Importando…
                </>
              ) : (
                <>
                  <Download size={14} /> Importar
                </>
              )}
            </BotonPlano>
          )}
        </div>
      </Modal>
    </>
  );
}
