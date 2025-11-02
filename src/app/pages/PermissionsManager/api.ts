import { getJSON, postJSON, delJSON } from "../../lib/http";

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

export const getUserRoles = (userId: number) =>
  getJSON<{ name: string; description?: string }[]>(`/api/admin/rbac/users/${userId}/roles`);
export const addRoleToUser = (userId: number, roleName: string) =>
  postJSON(`/api/admin/rbac/users/${userId}/roles/${encodeURIComponent(roleName)}`);
export const removeRoleFromUser = (userId: number, roleName: string) =>
  delJSON(`/api/admin/rbac/users/${userId}/roles/${encodeURIComponent(roleName)}`);

export const getUserOverrides = (userId: number) =>
  getJSON<{ code: string; description?: string; allow: boolean }[]>(`/api/admin/rbac/users/${userId}/permissions/overrides`);
export const setUserOverride = (userId: number, code: string, allow: boolean) =>
  postJSON(`/api/admin/rbac/users/${userId}/permissions/${encodeURIComponent(code)}?allow=${allow ? "true" : "false"}`);
export const clearUserOverride = (userId: number, code: string) =>
  delJSON(`/api/admin/rbac/users/${userId}/permissions/${encodeURIComponent(code)}`);

export const getEffective = (userId: number) =>
  getJSON<{ permissions: string[] }>(`/api/admin/rbac/users/${userId}/permissions/effective`);

// búsquedas de usuarios (reutilizamos tu endpoint de médicos)
export const searchUsers = (q: string) =>
  getJSON<any[]>(`/api/medicos?q=${encodeURIComponent(q)}&limit=50&skip=0`);
