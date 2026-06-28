import { describe, expect, it, vi, beforeEach } from "vitest";

import { ConnectionService } from "../services/connection.service";

const mockFindPendingPair = vi.fn();
const mockCreate = vi.fn();
const mockFindById = vi.fn();
const mockUpdateStatus = vi.fn();
const mockList = vi.fn();
const mockCount = vi.fn();
const mockNotify = vi.fn();
const mockAssertNotBlocked = vi.fn();

vi.mock("../repositories/connection.repository", () => ({
  ConnectionRepository: vi.fn().mockImplementation(() => ({
    findPendingPair: mockFindPendingPair,
    create: mockCreate,
    findById: mockFindById,
    updateStatus: mockUpdateStatus,
    list: mockList,
    count: mockCount,
  })),
}));

vi.mock("@/features/notifications/services/notification.service", () => ({
  NotificationService: vi.fn().mockImplementation(() => ({
    notify: mockNotify,
  })),
}));

vi.mock("@/server/policies/block.policy", () => ({
  blockPolicy: {
    assertNotBlocked: (...args: unknown[]) => mockAssertNotBlocked(...args),
  },
}));

describe("ConnectionService", () => {
  const service = new ConnectionService();

  beforeEach(() => {
    vi.clearAllMocks();
    mockAssertNotBlocked.mockResolvedValue(undefined);
  });

  it("rejects self-connection", async () => {
    await expect(
      service.send("user-1", { recipientUserId: "user-1" }),
    ).rejects.toMatchObject({ code: "INVALID_REQUEST" });
  });

  it("checks block policy before sending", async () => {
    mockFindPendingPair.mockResolvedValue(null);
    mockCreate.mockResolvedValue({ id: "conn-1" });
    await service.send("user-1", { recipientUserId: "user-2" });
    expect(mockAssertNotBlocked).toHaveBeenCalledWith("user-1", "user-2");
  });

  it("rejects duplicate pending connection", async () => {
    mockFindPendingPair.mockResolvedValue({ id: "existing" });
    await expect(
      service.send("user-1", { recipientUserId: "user-2" }),
    ).rejects.toMatchObject({ code: "DUPLICATE_CONNECTION", status: 409 });
  });

  it("notifies recipient on send", async () => {
    mockFindPendingPair.mockResolvedValue(null);
    mockCreate.mockResolvedValue({ id: "conn-1" });
    await service.send("user-1", { recipientUserId: "user-2" });
    expect(mockNotify).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "user-2",
        type: "CONNECTION_REQUEST",
      }),
    );
  });

  it("only recipient can respond", async () => {
    mockFindById.mockResolvedValue({
      id: "conn-1",
      recipientUserId: "user-2",
      requesterUserId: "user-1",
      status: "PENDING",
    });
    await expect(
      service.respond("user-1", "conn-1", { action: "ACCEPT" }),
    ).rejects.toMatchObject({ code: "FORBIDDEN", status: 403 });
  });

  it("accepts connection from recipient", async () => {
    mockFindById.mockResolvedValue({
      id: "conn-1",
      recipientUserId: "user-2",
      requesterUserId: "user-1",
      status: "PENDING",
    });
    mockUpdateStatus.mockResolvedValue({ id: "conn-1", status: "ACCEPTED" });
    const result = await service.respond("user-2", "conn-1", { action: "ACCEPT" });
    expect(result.status).toBe("ACCEPTED");
    expect(mockNotify).toHaveBeenCalledWith(
      expect.objectContaining({ type: "CONNECTION_ACCEPTED" }),
    );
  });
});
