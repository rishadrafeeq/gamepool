import { describe, expect, it, vi, beforeEach } from "vitest";

import { TeammateRequestService } from "../services/teammate-request.service";

const mockFindById = vi.fn();
const mockUpdateInterest = vi.fn();
const mockNotify = vi.fn();

vi.mock("../repositories/teammate-request.repository", () => ({
  TeammateRequestRepository: vi.fn().mockImplementation(() => ({
    findById: mockFindById,
    updateInterest: mockUpdateInterest,
  })),
}));

vi.mock("@/features/sports/repositories/sport.repository", () => ({
  SportRepository: vi.fn(),
}));

vi.mock("@/features/notifications/services/notification.service", () => ({
  NotificationService: vi.fn().mockImplementation(() => ({
    notify: mockNotify,
  })),
}));

describe("TeammateRequestService.reviewInterest", () => {
  const service = new TeammateRequestService();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("approves pending interest", async () => {
    mockFindById.mockResolvedValue({
      id: "req-1",
      creatorUserId: "creator-1",
      title: "Need midfielder",
      interests: [{ id: "int-1", userId: "user-2", status: "PENDING" }],
    });
    mockUpdateInterest.mockResolvedValue({ id: "int-1", status: "APPROVED" });

    const result = await service.reviewInterest("creator-1", "req-1", "int-1", "APPROVE");
    expect(result.status).toBe("APPROVED");
    expect(mockNotify).toHaveBeenCalled();
  });

  it("rejects non-owner review", async () => {
    mockFindById.mockResolvedValue({
      id: "req-1",
      creatorUserId: "creator-1",
      title: "Need midfielder",
      interests: [],
    });

    await expect(
      service.reviewInterest("other-user", "req-1", "int-1", "APPROVE"),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});
