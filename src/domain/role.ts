/** Role identifier (realm or client role name). */
export type Role = string;

/** Set of roles for authorization checks. */
export type Roles = Set<Role>;

export function rolesFromStrings(roles: string[]): Roles {
  return new Set(roles.filter((r): r is string => typeof r === "string" && r.length > 0));
}
