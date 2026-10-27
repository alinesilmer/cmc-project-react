import comun from "./Comun.module.scss";
import styles from "./CargaFacturacion.module.scss";
import { AlertTriangle } from "lucide-react";
import React from "react";
import { versionLabel } from "../types";
import type { CargaCtx } from "./useCargaFacturacion";

export default function CargaAutorizacion({ ctx }: { ctx: CargaCtx }) {
  const { autorizacion, setAutorizacion, autorizacionPorIntegrante, setAutorizacionPorIntegrante, precio, autorizacionesExistentes, formDisabled, admiteAyudante } = ctx;
  return (
    <>
      {/* 6b. Autorización */}
      <div className={comun.section}>
        <span className={comun.sectionTitle}>
          Autorización{" "}
          <span className={comun.sectionHint}>(opcional)</span>
        </span>
        <div className={styles.autorizacionFila}>
          <div className={comun.filterField}>
            <input
              className={comun.input}
              type="text"
              maxLength={30}
              value={autorizacion}
              onChange={(e) => setAutorizacion(e.target.value)}
              disabled={formDisabled}
              placeholder="Nº de autorización de la obra social"
            />
          </div>
          {autorizacionesExistentes.length > 0 && (
            <div className={styles.autorizacionAviso} role="alert">
              <AlertTriangle size={14} style={{ flexShrink: 0 }} />
              <span>
                Esta autorización ya está cargada en esta obra social:{" "}
                {autorizacionesExistentes.map((a, i) => (
                  <React.Fragment key={`${a.periodo}-${a.version}`}>
                    {i > 0 && ", "}
                    <strong>{a.periodo.slice(4)}/{a.periodo.slice(0, 4)}</strong>
                    {a.version > 1 && ` (${versionLabel(a.version)})`}
                    {` · ${a.cantidad} prestación${a.cantidad === 1 ? "" : "es"}`}
                    {a.estado_factura && a.estado_factura !== "A" && " · cerrada"}
                  </React.Fragment>
                ))}
              </span>
            </div>
          )}
        </div>
        {precio?.sin_precio && (
          <div className={comun.warningBox} style={{ textAlign: "left", display: "flex", alignItems: "center", gap: 8 }}>
            <AlertTriangle size={14} style={{ flexShrink: 0 }} />
            Este código está dado de alta en la obra social pero todavía no tiene precio: se
            carga en $0 y queda «sin valorizar» hasta que se cargue el precio.
          </div>
        )}
        {precio?.requiere_autorizacion && (
          <div className={comun.warningBox} style={{ textAlign: "left", display: "flex", alignItems: "center", gap: 8 }}>
            <AlertTriangle size={14} style={{ flexShrink: 0 }} />
            Esta obra social exige autorización previa para este código.
            {!autorizacion.trim() && " Todavía no cargaste el número."}
          </div>
        )}
        {admiteAyudante && (
          <label className={comun.radioLabel}>
            <input
              type="checkbox"
              checked={autorizacionPorIntegrante}
              onChange={(e) => setAutorizacionPorIntegrante(e.target.checked)}
              disabled={formDisabled}
            />
            Un Nº de autorización por cada integrante del equipo
          </label>
        )}
      </div>
    </>
  );
}
