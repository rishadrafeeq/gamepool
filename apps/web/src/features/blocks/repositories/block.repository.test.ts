import { describe, expect, it, vi, beforeEach } from "vitest";

import { BlockRepository } from "../repositories/block.repository";

const mockCreate = vi.fn();
const mockDeleteMany = vi.fn();
const mockFindUnique = vi.fn();

vi.mock("@gamepool/database", () => ({
  prisma: {
    userBlock: {
      create: (...args: unknown[]) => mockCreate(...args),
      deleteMany: (...args: unknown[]) => mockDeleteMany(...args),
      findUnique: (...args: unknown[]) => mockFindUnique(...args),
    },
  },
}));

describe("BlockRepository", () => {
  const repo = new BlockRepository();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates block with composite key fields", async () => {
    mockCreate.mockResolvedValue({ id: "b1" });
    await repo.create("blocker", "blocked");
    expect(mockCreate).toHaveBeenCalledWith({
      data: { blockerUserId: "blocker", blockedUserId: "blocked" },
    });
  });

  it("deletes by blocker and blocked pair", async () => {
    mockDeleteMany.mockResolvedValue({ count: 1 });
    await repo.delete("blocker", "blocked");
    expect(mockDeleteMany).toHaveBeenCalledWith({
      where: { blockerUserId: "blocker", blockedUserId: "blocked" },
    });
  });

  it("checks existence via unique constraint", async () => {
    mockFindUnique.mockResolvedValue(null);
    await repo.exists("blocker", "blocked");
    expect(mockFindUnique).toHaveBeenCalledWith({
      where: {
        blockerUserId_blockedUserId: {
          blockerUserId: "blocker",
          blockedUserId: "blocked",
        },
      },
    });
  });
});
