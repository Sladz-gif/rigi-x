// Staff roles and the permission map that decides what each role can open.
// NOTE: this mirrors what a server-side role check would do; here it is enforced
// on the client against the mock session because there is no backend yet.

export const ROLES = [
  "super_admin",
  "admin",
  "manager",
  "hr",
  "finance",
  "sales",
  "support",
  "fleet",
] as const;

export type Role = (typeof ROLES)[number];

export const ROLE_LABELS: Record<Role, string> = {
  super_admin: "Super Admin",
  admin: "Administrator",
  manager: "Operations Manager",
  hr: "HR",
  finance: "Finance",
  sales: "Sales",
  support: "Customer Service",
  fleet: "Fleet",
};

export const ADMIN_MODULES = [
  "dashboard",
  "sales",
  "customers",
  "support",
  "fleet",
  "maintenance",
  "inventory",
  "finance",
  "hr",
  "marketing",
  "settings",
] as const;

export type AdminModule = (typeof ADMIN_MODULES)[number];

const ALL: AdminModule[] = [...ADMIN_MODULES];

export const MODULE_ACCESS: Record<Role, AdminModule[]> = {
  super_admin: ALL,
  admin: ALL,
  manager: [
    "dashboard",
    "sales",
    "customers",
    "support",
    "fleet",
    "maintenance",
    "inventory",
    "marketing",
    "settings",
  ],
  hr: ["dashboard", "hr", "support"],
  finance: ["dashboard", "sales", "customers", "finance"],
  sales: ["dashboard", "sales", "customers"],
  support: ["dashboard", "support", "customers"],
  fleet: ["dashboard", "fleet", "maintenance", "inventory"],
};

export type Capability =
  | "reveal_sensitive"
  | "manage_users"
  | "manage_payroll"
  | "delete_records"
  | "view_finance";

const CAPABILITIES: Record<Role, Capability[]> = {
  super_admin: [
    "reveal_sensitive",
    "manage_users",
    "manage_payroll",
    "delete_records",
    "view_finance",
  ],
  admin: [
    "reveal_sensitive",
    "manage_users",
    "manage_payroll",
    "delete_records",
    "view_finance",
  ],
  manager: ["reveal_sensitive", "view_finance"],
  hr: ["reveal_sensitive", "manage_payroll", "view_finance"],
  finance: ["reveal_sensitive", "manage_payroll", "view_finance"],
  sales: [],
  support: [],
  fleet: [],
};

export function canAccessModule(role: Role, module: AdminModule): boolean {
  return MODULE_ACCESS[role]?.includes(module) ?? false;
}

export function hasCapability(role: Role, capability: Capability): boolean {
  return CAPABILITIES[role]?.includes(capability) ?? false;
}

/** Mask an identifier, keeping the last `visible` characters. */
export function maskId(value: string, visible = 4): string {
  if (!value) return "—";
  const tail = value.slice(-visible);
  return `${"•".repeat(Math.max(4, value.length - visible))}${tail}`;
}
