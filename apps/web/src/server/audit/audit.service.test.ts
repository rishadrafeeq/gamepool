import { describe, expect, it, vi, beforeEach } from "vitest";

import { AuditService } from "./audit.service";

const mockCreate = vi.fn();

vi.mock("@gamepool/database", () => ({
  prisma: {
    adminAuditEvent: {
      create: (...args: unknown[]) => mockCreate(...args),
    },
  },
}));

describe("AuditService", () => {
  const audit = new AuditService();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("persists admin audit events with metadata", async () => {
    mockCreate.mockResolvedValue({ id: "audit-1" });
    await audit.log({
      adminUserId: "admin-1",
      action: "USER_SUSPENDED",
      entityType: "USER",
      entityId: "user-1",
      metadata: { reason: "spam" },
      ipAddress: "127.0.0.1",
    });

    expect(mockCreate).toHaveBeenCalledWith({
      data: {
        adminUserId: "admin-1",
        action: "USER_SUSPENDED",
        entityType: "USER",
        entityId: "user-1",
        metadata: { reason: "spam" },
        ipAddress: "127.0.0.1",
      },
    });
  });

  it("defaults metadata and ip when omitted", async () => {
    mockCreate.mockResolvedValue({ id: "audit-2" });
    await audit.log({
      adminUserId: "admin-1",
      action: "MATCH_UPDATED",
      entityType: "MATCH",
      entityId: "match-1",
    });

    expect(mockCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        metadata: {},
        ipAddress: null,
      }),
    });
  });
});
