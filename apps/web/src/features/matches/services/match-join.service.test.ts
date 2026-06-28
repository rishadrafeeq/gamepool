import { describe, expect, it, vi, beforeEach } from "vitest";

import { MatchJoinService } from "../services/match-join.service";
import { ApiError } from "@/server/errors/api-error";

const mockFindById = vi.fn();
const mockFindActive = vi.fn();

vi.mock("../repositories/match.repository", () => ({
  MatchRepository: vi.fn().mockImplementation(() => ({
    findById: mockFindById,
  })),
}));

vi.mock("../repositories/participant.repository", () => ({
  ParticipantRepository: vi.fn().mockImplementation(() => ({
    findActive: mockFindActive,
  })),
}));

vi.mock("../repositories/match-join-request.repository", () => ({
  MatchJoinRequestRepository: vi.fn(),
}));

vi.mock("@/features/notifications/services/notification.service", () => ({
  NotificationService: vi.fn().mockImplementation(() => ({
    notify: vi.fn(),
  })),
}));

vi.mock("@gamepool/database", () => ({
  prisma: {
    $transaction: vi.fn(async (fn: (tx: unknown) => Promise<unknown>) => fn({})),
  },
}));

describe("MatchJoinService.leaveMatch", () => {
  const service = new MatchJoinService();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects leave inside cutoff window", async () => {
    const startsAt = new Date(Date.now() + 60 * 60 * 1000);
    mockFindById.mockResolvedValue({
      id: "m1",
      status: "OPEN",
      startsAt,
      leaveCutoffHours: 2,
      title: "Test",
      maxParticipants: 10,
      confirmedCount: 5,
    });
    mockFindActive.mockResolvedValue({
      id: "p1",
      role: "PARTICIPANT",
      status: "CONFIRMED",
    });

    await expect(service.leaveMatch("user-1", "m1")).rejects.toMatchObject({
      code: "LEAVE_CUTOFF_PASSED",
    });
  });

  it("rejects host leave", async () => {
    mockFindById.mockResolvedValue({
      id: "m1",
      status: "OPEN",
      startsAt: new Date(Date.now() + 86400000),
      leaveCutoffHours: 2,
    });
    mockFindActive.mockResolvedValue({
      id: "p1",
      role: "HOST",
      status: "CONFIRMED",
    });

    await expect(service.leaveMatch("host-1", "m1")).rejects.toBeInstanceOf(ApiError);
  });
});
