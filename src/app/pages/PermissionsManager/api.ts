import { getJSON, postJSON, delJSON } from "@/app/shared/lib/http";

export type Role = { id: number; name: string; description?: string };
export type Permission = { id?: number; code: string; description?: string };

export const listRoles = () => getJSON<Role[]>("/api/admin/rbac/roles");
export const listPermissions = () => getJSON<Permission[]>("/api/admin/rbac/permissions");

export const getRolePerms = (roleName: string) =>
  getJSON<Permission[]>(`/api/admin/rbac/roles/${encodeURIComponent(roleName)}/permissions`);

export const addPermToRole = (roleName: string, code: string) =>
  postJSON(`/api/admin/rbac/roles/${encodeURIComponent(roleName)}/permissions/${encodeURIComponent(code)}`);

export const removePermFromRole = (roleName: string, code: string) =>
  delJSON(`/api/admin/rbac/roles/${encodeURIComponent(roleName)}/permissions/${encodeURIComponent(code)}`);

