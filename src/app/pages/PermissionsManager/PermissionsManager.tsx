"use client";
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import RequirePermission from "../../../auth/RequirePermission";
import s from "./PermissionsManager.module.scss";

import {
  listRoles,
  listPermissions,
  getRolePerms,
  addPermToRole,
  removePermFromRole,
} from "./api";
import BackButton from "../../../components/atoms/BackButton/BackButton";
import SearchBar from "../../../components/molecules/SearchBar/SearchBar";

// ---------- Mapeo visual de permisos ----------
// Categorías por prefijo de código (mostrar ≠ almacenar)
const CATEGORY_LABEL: Record<string, string> = {
  todos: "Todos",
  medicos: "Médicos",
  facturacion: "Facturación",
  liquidacion: "Liquidación",
  contabilidad: "Contabilidad",
  admin: "Administración",
  otros: "Otros",
};

function getPermCategory(code: string): keyof typeof CATEGORY_LABEL {
  if (code.startsWith("medicos:")) return "medicos";
  if (code.startsWith("facturas:") || code.startsWith("facturacion:")) return "facturacion";
  if (code.startsWith("liquidacion:")) return "liquidacion";
  if (code.startsWith("contabilidad:") || code.startsWith("contable:")) return "contabilidad";
  if (code.startsWith("rbac:") || code.startsWith("admin:")) return "admin";
  return "otros";
}


// Fallback para códigos no mapeados: "algo:mi_permiso" -> "Mi permiso"
const humanize = (code: string) => {
  const last = code.split(":").pop() || code;
  return last.replace(/[_.-]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
};
const ROLE_LABELS: Record<string, string> = {
  admin: "Administrador/a",
  medico: "Médico/a",
  facturador: "Facturador/a",
  liquidador: "Liquidador/a",
  contador: "Contador/a",
};

const roleDisplay = (name: string) => ROLE_LABELS[name] ?? name;

type Role = { name: string; description?: string };
type Permission = { code: string; description?: string };

const PermissionsManager: React.FC = () => {
  // const nav = useNavigate();

  const [roles, setRoles] = useState<Role[]>([]);
  const [activeRole, setActiveRole] = useState<string | null>(null);

  const [perms, setPerms] = useState<Permission[]>([]);
  const [rolePerms, setRolePerms] = useState<string[]>([]);

  const [q, setQ] = useState("");
  const [category, setCategory] = useState<keyof typeof CATEGORY_LABEL>("todos");

  const [loadingRoles, setLoadingRoles] = useState(true);
  const [loadingPerms, setLoadingPerms] = useState(true);
  const [loadingRolePerms, setLoadingRolePerms] = useState(false);

  // Cargar roles y permisos
  useEffect(() => {
    (async () => {
      setLoadingRoles(true);
      setLoadingPerms(true);
      const [r, p] = await Promise.all([listRoles(), listPermissions()]);
      setRoles(r);
      setPerms(p);
      console.log("Permisos cargados:", p);
      if (!activeRole && r.length) setActiveRole(r[0].name);
      setLoadingRoles(false);
      setLoadingPerms(false);
    })();
  }, []);

  // Cargar permisos del rol activo
  useEffect(() => {
    if (!activeRole) return;
    (async () => {
      setLoadingRolePerms(true);
      const rp = await getRolePerms(activeRole);
      setRolePerms(rp.map((x) => x.code));
      setLoadingRolePerms(false);
    })();
  }, [activeRole]);

  // Permisos con mapeo (label + categoría)
  const displayPerms = useMemo(() => {
    return perms.map((p) => ({
      code: p.code,
      label: p.description || humanize(p.code),
      category: getPermCategory(p.code),
    }));
  }, [perms]);

  // Filtro por búsqueda + categoría
  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return displayPerms.filter((p) => {
      if (category !== "todos" && p.category !== category) return false;
      if (!term) return true;
      return p.label.toLowerCase().includes(term) || p.code.toLowerCase().includes(term);
    });
  }, [displayPerms, q, category]);

  const roleHas = (code: string) => rolePerms.includes(code);

  return (
    <RequirePermission scope="rbac:gestionar">
      <div className={s.container}>
        <BackButton />
        
        <div className={s.header}>
          <h1 className={s.title}>Gestor de Permisos</h1>
          <p className={s.subtitle}>
            Selecciona un rol para ver y modificar sus permisos asociados.
          </p>
        </div>

        <div className={s.tableContainer}>
          {/* Columna de Roles */}
          <div className={s.groupSide}>
            <table className={s.table}>
              <thead>
                <tr><th>Roles</th></tr>
              </thead>
              <tbody>
                {loadingRoles ? (
                  <tr><td style={{ textAlign: "center", padding: 12 }}>⏳ Cargando…</td></tr>
                ) : roles.length === 0 ? (
                  <tr><td style={{ textAlign: "center", padding: 12 }}>Sin roles</td></tr>
                ) : (
                  roles.map((r) => (
                    <tr
                      key={r.name}
                      onClick={() => setActiveRole(r.name)}           // ← seguimos usando el "name" técnico
                      style={{
                        cursor: "pointer",
                        background: activeRole === r.name ? "rgba(0,0,0,0.04)" : undefined,
                      }}
                    >
                      <td>{roleDisplay(r.name)}</td>                  {/* ← mostramos la etiqueta */}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Columna de Permisos */}
          <div className={s.permsSide}>
            <div className={s.searchBar} style={{ display: "flex", gap: 8 }}>
              <SearchBar
                placeholder="Buscar permiso..."
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />

              <select
                className={s.searchInput}
                value={category}
                onChange={(e) => setCategory(e.target.value as any)}
                style={{ maxWidth: 220 }}
                aria-label="Categoría"
              >
                {Object.entries(CATEGORY_LABEL).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>

            <table className={s.table} style={{ marginTop: 12 }}>
              <thead>
                <tr>
                  <th>Permiso</th>
                  <th style={{ width: 120 }}>Tiene</th>
                </tr>
              </thead>
              <tbody>
                {loadingPerms || loadingRolePerms ? (
                  <tr><td colSpan={2} style={{ textAlign: "center", padding: 12 }}>⏳ Cargando…</td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={2} style={{ textAlign: "center", padding: 12 }}>Sin resultados</td></tr>
                ) : (
                  filtered.map((p) => {
                    const checked = roleHas(p.code);
                    return (
                      <tr key={p.code}>
                        <td>
                          <div style={{ display: "flex", flexDirection: "column" }}>
                            <span>{p.label}</span>
                            <small style={{ opacity: 0.6 }}>{p.code}</small>
                          </div>
                        </td>
                        <td>
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={async (e) => {
                              if (!activeRole) return;
                              const next = e.target.checked;
                              if (next) await addPermToRole(activeRole, p.code);
                              else await removePermFromRole(activeRole, p.code);
                              const rp = await getRolePerms(activeRole);
                              setRolePerms(rp.map((x) => x.code));
                            }}
                          />
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </RequirePermission>
  );
};

export default PermissionsManager;
