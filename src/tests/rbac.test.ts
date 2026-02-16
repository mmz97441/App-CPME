import { describe, it, expect } from "vitest";
import { hasPermission, ROLE_PERMISSIONS } from "@/types";
import type { Role } from "@prisma/client";

describe("RBAC - hasPermission", () => {
  it("should allow ENTREPRENEUR to create diagnostics", () => {
    expect(hasPermission("ENTREPRENEUR" as Role, "diagnostic:create")).toBe(
      true
    );
  });

  it("should not allow ENTREPRENEUR to read all diagnostics", () => {
    expect(
      hasPermission("ENTREPRENEUR" as Role, "diagnostic:read:all")
    ).toBe(false);
  });

  it("should not allow ENTREPRENEUR to access admin", () => {
    expect(hasPermission("ENTREPRENEUR" as Role, "admin:users")).toBe(false);
  });

  it("should allow ADMIN all permissions", () => {
    expect(hasPermission("ADMIN" as Role, "diagnostic:create")).toBe(true);
    expect(hasPermission("ADMIN" as Role, "diagnostic:read:all")).toBe(true);
    expect(hasPermission("ADMIN" as Role, "admin:users")).toBe(true);
    expect(hasPermission("ADMIN" as Role, "admin:audit")).toBe(true);
    expect(hasPermission("ADMIN" as Role, "observatory:read")).toBe(true);
    expect(hasPermission("ADMIN" as Role, "signalement:moderate")).toBe(true);
  });

  it("should allow ANALYSTE to read all and access observatory", () => {
    expect(hasPermission("ANALYSTE" as Role, "diagnostic:read:all")).toBe(true);
    expect(hasPermission("ANALYSTE" as Role, "observatory:read")).toBe(true);
    expect(hasPermission("ANALYSTE" as Role, "export:pdf")).toBe(true);
  });

  it("should not allow ANALYSTE to create diagnostics", () => {
    expect(hasPermission("ANALYSTE" as Role, "diagnostic:create")).toBe(false);
  });

  it("should allow MODERATEUR to moderate signalements", () => {
    expect(
      hasPermission("MODERATEUR" as Role, "signalement:moderate")
    ).toBe(true);
    expect(
      hasPermission("MODERATEUR" as Role, "signalement:read:all")
    ).toBe(true);
  });

  it("should not allow MODERATEUR to create diagnostics", () => {
    expect(hasPermission("MODERATEUR" as Role, "diagnostic:create")).toBe(
      false
    );
  });

  it("should only allow DATA_VIEW_ONLY to read observatory", () => {
    expect(hasPermission("DATA_VIEW_ONLY" as Role, "observatory:read")).toBe(
      true
    );
    expect(
      hasPermission("DATA_VIEW_ONLY" as Role, "diagnostic:create")
    ).toBe(false);
    expect(
      hasPermission("DATA_VIEW_ONLY" as Role, "signalement:create")
    ).toBe(false);
    expect(hasPermission("DATA_VIEW_ONLY" as Role, "health:create")).toBe(
      false
    );
  });

  it("should allow INSTITUTION to read data and export", () => {
    expect(
      hasPermission("INSTITUTION" as Role, "diagnostic:read:all")
    ).toBe(true);
    expect(hasPermission("INSTITUTION" as Role, "observatory:read")).toBe(
      true
    );
    expect(hasPermission("INSTITUTION" as Role, "export:pdf")).toBe(true);
  });

  it("should have all 6 roles defined", () => {
    const roles: Role[] = [
      "ENTREPRENEUR",
      "ADMIN",
      "ANALYSTE",
      "MODERATEUR",
      "INSTITUTION",
      "DATA_VIEW_ONLY",
    ] as Role[];

    for (const role of roles) {
      expect(ROLE_PERMISSIONS[role]).toBeDefined();
      expect(Array.isArray(ROLE_PERMISSIONS[role])).toBe(true);
    }
  });
});
