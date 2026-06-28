import { describe, expect, it } from "vitest";

import { canModerate, canSuperAdmin } from "@/features/admin/lib/rbac";

describe("admin RBAC", () => {
  it("SUPPORT cannot moderate", () => {
    expect(canModerate("SUPPORT")).toBe(false);
  });

  it("MODERATOR can moderate", () => {
    expect(canModerate("MODERATOR")).toBe(true);
  });

  it("SUPER_ADMIN can moderate", () => {
    expect(canModerate("SUPER_ADMIN")).toBe(true);
  });

  it("only SUPER_ADMIN has super admin privileges", () => {
    expect(canSuperAdmin("SUPER_ADMIN")).toBe(true);
    expect(canSuperAdmin("MODERATOR")).toBe(false);
    expect(canSuperAdmin("SUPPORT")).toBe(false);
    expect(canSuperAdmin(undefined)).toBe(false);
  });
});
