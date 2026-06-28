import { describe, expect, it, vi, beforeEach } from "vitest";

import { OpponentRequestService } from "../services/opponent-request.service";

const mockFindById = vi.fn();
const mockTransaction = vi.fn();

vi.mock("../repositories/opponent-request.repository", () => ({
  OpponentRequestRepository: vi.fn().mockImplementation(() => ({
    findById: mockFindById,
  })),
}));

vi.mock("@/features/sports/repositories/sport.repository", () => ({
  SportRepository: vi.fn(),
}));

vi.mock("@/features/notifications/services/notification.service", () => ({
  NotificationService: vi.fn().mockImplementation(() => ({
    notify: vi.fn(),
  })),
}));

vi.mock("@gamepool/database", () => ({
  prisma: {
    $transaction: (fn: (tx: unknown) => Promise<unknown>) => mockTransaction(fn),
  },
}));

describe("OpponentRequestService.pair", () => {
  const service = new OpponentRequestService();

  beforeEach(() => {
    vi.clearAllMocks();
    mockTransaction.mockImplementation(async (fn: (tx: { opponentRequest: { update: ReturnType<typeof vi.fn> } }) => Promise<unknown>) =>
      fn({
        opponentRequest: {
          update: vi.fn().mockResolvedValue({}),
        },
      }),
    );
  });

  it("pairs two open requests", async () => {
    mockFindById
      .mockResolvedValueOnce({
        id: "req-a",
        creatorUserId: "creator-a",
        status: "OPEN",
      })
      .mockResolvedValueOnce({
        id: "req-b",
        creatorUserId: "creator-b",
        status: "OPEN",
      });

    const result = await service.pair("creator-a", "req-a", { opponentRequestId: "req-b" });
    expect(result.paired).toBe(true);
    expect(mockTransaction).toHaveBeenCalled();
  });

  it("rejects pairing when opponent request not open", async () => {
    mockFindById
      .mockResolvedValueOnce({
        id: "req-a",
        creatorUserId: "creator-a",
        status: "OPEN",
      })
      .mockResolvedValueOnce(null);

    await expect(
      service.pair("creator-a", "req-a", { opponentRequestId: "req-b" }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
});
