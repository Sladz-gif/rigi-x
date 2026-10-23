import { describe, it, expect } from "vitest";
import {
  ADMIN_MODULES,
  MODULE_ACCESS,
  ROLES,
  canAccessModule,
  hasCapability,
  maskId,
} from "./permissions";

describe("role permission map", () => {
  it("lets the top roles open every module", () => {
    for (const role of ["super_admin", "admin"] as const) {
      for (const moduleName of ADMIN_MODULES) {
        expect(canAccessModule(role, moduleName)).toBe(true);
      }
    }
  });

  it("keeps scoped roles inside their own modules", () => {
    expect(canAccessModule("hr", "hr")).toBe(true);
    expect(canAccessModule("hr", "finance")).toBe(false);
    expect(canAccessModule("finance", "hr")).toBe(false);
    expect(canAccessModule("finance", "finance")).toBe(true);
    expect(canAccessModule("fleet", "finance")).toBe(false);
    expect(canAccessModule("fleet", "maintenance")).toBe(true);
    expect(canAccessModule("sales", "customers")).toBe(true);
  });

  it("gives every role the dashboard", () => {
    for (const role of ROLES) {
      expect(canAccessModule(role, "dashboard")).toBe(true);
    }
  });

  it("only references modules that exist", () => {
    for (const role of ROLES) {
      for (const moduleName of MODULE_ACCESS[role]) {
        expect(ADMIN_MODULES).toContain(moduleName);
      }
    }
  });
});

describe("capabilities", () => {
  it("scopes destructive and payroll actions", () => {
    expect(hasCapability("support", "delete_records")).toBe(false);
    expect(hasCapability("manager", "delete_records")).toBe(false);
    expect(hasCapability("admin", "delete_records")).toBe(true);
    expect(hasCapability("hr", "manage_payroll")).toBe(true);
    expect(hasCapability("sales", "manage_payroll")).toBe(false);
    expect(hasCapability("finance", "view_finance")).toBe(true);
    expect(hasCapability("fleet", "view_finance")).toBe(false);
  });
});

describe("maskId", () => {
  it("hides all but the tail of an identifier", () => {
    expect(maskId("")).toBe("—");
    expect(maskId("ABCDEF", 2)).toBe("••••EF");
    expect(maskId("GHA-1234567890", 4)).toHaveLength(14);
    expect(maskId("GHA-1234567890", 4).endsWith("7890")).toBe(true);
  });
});
