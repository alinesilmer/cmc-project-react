import Tabla from "@/app/components/ui/Tabla/Tabla";
import styles from "../DoctorProfilePage.module.scss";
import type { LegajoPermisos } from "./useLegajoPermisos";

export default function TabPermisos({ permisos }: { permisos: LegajoPermisos }) {
  const { rolesAll, userRoles, permList, effective, rbacLoading, cambiarRol, cambiarPermiso } = permisos;

  return (
    <>
          <div className={styles.tableWrap}>
            <h5 className={styles.section}>Roles</h5>
            <Tabla className={styles.table}>
              <tbody>
                {rbacLoading ? (
                  <tr>
                    <td className={styles.mutedCenter}>
                      Cargando…
                    </td>
                  </tr>
                ) : rolesAll.length === 0 ? (
                  <tr>
                    <td className={styles.mutedCenter}>
                      Sin roles
                    </td>
                  </tr>
                ) : (
                  rolesAll.map((r) => {
                    const checked = userRoles.includes(r.name);
                    return (
                      <tr key={r.name}>
                        <td>
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(e) =>
                              cambiarRol(r.name, e.target.checked)
                            }
                          />
                        </td>
                        <td>
                          {r.name.charAt(0).toUpperCase() +
                            r.name.slice(1)}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </Tabla>
          </div>

          <div className={styles.tableWrap}>
            <h5 className={styles.section}>Permisos</h5>
            <Tabla className={styles.table}>
              <tbody>
                {rbacLoading ? (
                  <tr>
                    <td className={styles.mutedCenter}>
                      Cargando…
                    </td>
                  </tr>
                ) : permList.length === 0 ? (
                  <tr>
                    <td className={styles.mutedCenter}>
                      Sin permisos
                    </td>
                  </tr>
                ) : (
                  permList.map((p) => {
                    const has = effective.includes(p.code);
                    return (
                      <tr key={p.code}>
                        <td>{p.description}</td>
                        <td style={{ textAlign: "right" }}>
                          <input
                            type="checkbox"
                            checked={has}
                            onChange={(e) =>
                              cambiarPermiso(p.code, e.target.checked)
                            }
                          />
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </Tabla>
          </div>
    </>
  );
}
