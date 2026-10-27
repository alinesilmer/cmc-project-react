"use client";
import React, { useEffect, useMemo, useState } from "react";
import { ShieldCheck } from "lucide-react";
import RequirePermission from "../../auth/RequirePermission";
import s from "./PermissionsManager.module.scss";

import {
  listRoles,
  listPermissions,
  getRolePerms,
  addPermToRole,
  removePermFromRole,
} from "./api";
import SearchField from "@/app/components/ui/SearchField/SearchField";
import Tabla from "@/app/components/ui/Tabla/Tabla";
import Franja from "@/app/components/layout/Franja/Franja";
import BotonPlano from "@/app/components/ui/BotonPlano/BotonPlano";

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
      setActiveRole((actual) => actual ?? r[0]?.name ?? null);
      setLoadingRoles(false);
      setLoadingPerms(false);
    })();
  }, []);

  // Cargar permisos del rol activo
  useEffect(() => {
    if (!activeRole) return;
    // Si cambia el rol antes de que llegue la respuesta, se descarta.
    let vigente = true;
    (async () => {
      setLoadingRolePerms(true);
      try {
        const rp = await getRolePerms(activeRole);
        if (vigente) setRolePerms(rp.map((x) => x.code));
      } finally {
        if (vigente) setLoadingRolePerms(false);
      }
    })();
    return () => {
      vigente = false;
    };
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
        <Franja titulo="Permisos" icono={ShieldCheck} />

        <div className={s.mesa}>
          <nav className={s.roles} aria-label="Roles">
            <h2 className={s.rotulo}>Rol</h2>
            {loadingRoles ? (
              <p className={s.estado}>Cargando…</p>
            ) : roles.length === 0 ? (
              <p className={s.estado}>Sin roles</p>
            ) : (
              roles.map((r) => (
                <BotonPlano
                  key={r.name}
                  type="button"
                  className={`${s.rol} ${activeRole === r.name ? s.rolActivo : ""}`}
                  aria-pressed={activeRole === r.name}
                  onClick={() => setActiveRole(r.name)}
                >
                  {roleDisplay(r.name)}
                  {activeRole === r.name && !loadingRolePerms && (
                    <span className={s.cuenta}>{rolePerms.length}</span>
                  )}
                </BotonPlano>
              ))
            )}
          </nav>

          <div className={s.permisos}>
            <div className={s.categorias} role="group" aria-label="Categoría">
              {Object.entries(CATEGORY_LABEL).map(([k, v]) => (
                <BotonPlano
                  key={k}
                  type="button"
                  className={`${s.categoria} ${category === k ? s.categoriaActiva : ""}`}
                  aria-pressed={category === k}
                  onClick={() => setCategory(k)}
                >
                  {v}
                </BotonPlano>
              ))}
            </div>

            <SearchField
              placeholder="Buscar permiso…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onClear={() => setQ("")}
            />

            <div className={s.hoja}>
              <Tabla>
                <thead>
                  <tr>
                    <th>Permiso</th>
                    <th className={s.colTiene}>Tiene</th>
                  </tr>
                </thead>
                <tbody>
                  {loadingPerms || loadingRolePerms ? (
                    <tr>
                      <td colSpan={2} className={s.estado}>Cargando…</td>
                    </tr>
                  ) : filtered.length === 0 ? (
                    <tr>
                      <td colSpan={2} className={s.estado}>Sin resultados</td>
                    </tr>
                  ) : (
                    filtered.map((p) => {
                      const checked = roleHas(p.code);
                      return (
                        <tr key={p.code}>
                          {/* El código técnico queda en el globo: lo que se lee es la frase. */}
                          <td title={p.code}>{p.label}</td>
                          <td className={s.colTiene}>
                            <input
                              type="checkbox"
                              className={s.llave}
                              aria-label={p.label}
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
              </Tabla>
            </div>
          </div>
        </div>
      </div>
    </RequirePermission>
  );
};

export default PermissionsManager;
