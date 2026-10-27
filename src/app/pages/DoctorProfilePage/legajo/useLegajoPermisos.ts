import { useEffect, useState } from "react";
import {
  addUserRole,
  delUserRole,
  getEffective,
  getOverrides,
  getUserRoles,
  listPermissions,
  listRoles,
  setOverride,
} from "../api";
import type { Permission, Role } from "../api";
import type { TabKey } from "./legajo.types";

/** Pestaña Permisos (RBAC): roles del socio y permisos efectivos. */
export function useLegajoPermisos(medicoId: string, tab: TabKey, readOnly: boolean) {
  const [rolesAll, setRolesAll] = useState<Role[]>([]);
  const [userRoles, setUserRoles] = useState<string[]>([]);
  const [permList, setPermList] = useState<Permission[]>([]);
  const [, setOverrides] = useState<Record<string, boolean>>({});
  const [effective, setEffective] = useState<string[]>([]);
  const [rbacLoading, setRbacLoading] = useState(false);

  useEffect(() => {
    if (tab !== "permisos" || readOnly) return;
    let alive = true;
    (async () => {
      setRbacLoading(true);
      try {
        const [allRoles, userRs, permsAll, ovs, eff] = await Promise.all([
          listRoles(),
          getUserRoles(medicoId),
          listPermissions(),
          getOverrides(medicoId),
          getEffective(medicoId),
        ]);
        if (!alive) return;
        setRolesAll(allRoles);
        setUserRoles(userRs.map((r) => r.name));
        setPermList(permsAll);
        const map: Record<string, boolean> = {};
        ovs.forEach((o) => (map[o.code] = o.allow));
        setOverrides(map);
        setEffective(eff.permissions);
      } finally {
        if (alive) setRbacLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [tab, medicoId, readOnly]);

  async function cambiarRol(name: string, checked: boolean) {
    if (checked) await addUserRole(medicoId, name);
    else await delUserRole(medicoId, name);
    const rs = await getUserRoles(medicoId);
    setUserRoles(rs.map((x) => x.name));
    const eff = await getEffective(medicoId);
    setEffective(eff.permissions);
  }

  async function cambiarPermiso(code: string, checked: boolean) {
    await setOverride(medicoId, code, checked);
    const eff = await getEffective(medicoId);
    setEffective(eff.permissions);
    const ovs = await getOverrides(medicoId);
    const map: Record<string, boolean> = {};
    ovs.forEach((o) => (map[o.code] = o.allow));
    setOverrides(map);
  }

  return { rolesAll, userRoles, permList, effective, rbacLoading, cambiarRol, cambiarPermiso };
}

export type LegajoPermisos = ReturnType<typeof useLegajoPermisos>;
