import styles from "./NomencladorPorOS.module.scss";
import paleta from "@/app/styles/paleta.module.scss";
import { X as XIcon } from "lucide-react";
import Cargando from "@/app/components/ui/Cargando/Cargando";
import { Link } from "react-router-dom";
import EstadoCodigoPill from "../components/EstadoCodigoPill";
import type { PorOSCtx } from "./useNomencladorPorOS";
import BotonPlano from "@/app/components/ui/BotonPlano/BotonPlano";

export default function ModalCrearCodigo({ ctx }: { ctx: PorOSCtx }) {
  const { selectedNroOS, form, errors, parAlta, parCargando, nomSearch, nomResults, nomLoading, selectedOS, bloqueadoPorAlta, searchNom, selectNom, clearNom } = ctx;
  return (
    <>
      {/* Nomenclador picker */}
      <div className={styles.formGroup}>
        <label className={styles.formLabel}>
          Código de nomenclador <span className={styles.req}>*</span>
        </label>
        {form.nomencladorId ? (
          <div className={styles.selectedCode}>
            <strong>{form.nomencladorLabel}</strong>
            {form.nomencladorDesc && (
              <span className={styles.selectedCodeDesc}>{form.nomencladorDesc}</span>
            )}
            <BotonPlano
              style={{
                marginLeft: "auto",
                background: "none",
                border: "none",
                cursor: "pointer",
                color: paleta.tonoAzul400,
              }}
              onClick={clearNom}
            >
              <XIcon size={14} />
            </BotonPlano>
          </div>
        ) : (
          <div className={styles.autocompleteWrap}>
            <div style={{ position: "relative" }}>
              <input
                className={`${styles.formInput} ${errors.nomenclador ? styles.inputError : ""}`}
                value={nomSearch}
                onChange={(e) => searchNom(e.target.value)}
                placeholder="Buscá por código o por nombre…"
                style={{
                  paddingRight: nomLoading ? 36 : 12,
                  width: "100%",
                  boxSizing: "border-box",
                }}
              />
              {nomLoading && (
                <span
                  style={{
                    position: "absolute",
                    right: 10,
                    top: "50%",
                    transform: "translateY(-50%)",
                    color: paleta.tonoAzul400,
                  }}
                >
                  <Cargando
                    size={14}
                  />
                </span>
              )}
            </div>
            {nomResults.length > 0 && (
              <ul className={styles.autocompleteDropdown}>
                {nomResults.map((n) => (
                  <li
                    key={n.id}
                    className={styles.autocompleteItem}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      selectNom(n);
                    }}
                  >
                    <strong>{n.codigo}</strong>
                    {" - "}
                    {n.descripcion ?? ""}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
        {errors.nomenclador && (
          <span className={styles.errorMsg}>
            {errors.nomenclador}
          </span>
        )}
        {form.nomencladorId && (
          <div className={styles.altaBox}>
            {parCargando ? (
              <span className={styles.hintText}>Revisando el alta del código en la obra social…</span>
            ) : bloqueadoPorAlta && parAlta ? (
              <div className={styles.altaBloqueo}>
                <strong>
                  {parAlta.estado === "suspendido"
                    ? `${form.nomencladorLabel} está suspendido en ${selectedOS?.nombre ?? "esta obra social"}.`
                    : `${selectedOS?.nombre ?? "Esta obra social"} no tiene dado de alta el código ${form.nomencladorLabel}.`}
                </strong>
                <span>
                  Para cargarle un precio primero tiene que reconocer el código: descripción,
                  quién lo factura y condiciones. Es un paso corto y no pide importes.
                </span>
                <Link
                  className={styles.btnPrimary}
                  to={`/panel/nomenclador/codigos-por-os?os=${selectedNroOS}&codigo=${form.nomencladorLabel}`}
                >
                  {parAlta.estado === "suspendido" ? "Reactivar en Códigos por obra social" : "Dar de alta en Códigos por obra social"}
                </Link>
              </div>
            ) : parAlta ? (
              <div className={styles.altaOk}>
                <EstadoCodigoPill estado={parAlta.estado} />
                <span>
                  {parAlta.sin_restriccion_especialidad
                    ? "Lo factura cualquier especialidad"
                    : `Lo facturan ${parAlta.especialidades.length} especialidades`}
                  {" · "}
                  <Link to={`/panel/nomenclador/codigos-por-os?os=${selectedNroOS}&codigo=${form.nomencladorLabel}`}>
                    Editar el alta
                  </Link>
                </span>
              </div>
            ) : null}
          </div>
        )}
      </div>
    </>
  );
}
