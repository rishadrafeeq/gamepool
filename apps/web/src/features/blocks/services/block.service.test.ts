import { describe, expect, it, vi, beforeEach } from "vitest";

import { BlockService } from "../services/block.service";
import { ApiError } from "@/server/errors/api-error";

const mockExists = vi.fn();
const mockCreate = vi.fn();
const mockDelete = vi.fn();

vi.mock("../repositories/block.repository", () => ({
  BlockRepository: vi.fn().mockImplementation(() => ({
    exists: mockExists,
    create: mockCreate,
    delete: mockDelete,
  })),
}));

describe("BlockService", () => {
  const service = new BlockService();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects self-block", async () => {
    await expect(service.block("user-1", "user-1")).rejects.toMatchObject({
      code: "INVALID_REQUEST",
      status: 400,
    });
    expect(mockExists).not.toHaveBeenCalled();
  });

  it("rejects duplicate block", async () => {
    mockExists.mockResolvedValue({ id: "block-1" });
    await expect(service.block("user-1", "user-2")).rejects.toMatchObject({
      code: "ALREADY_BLOCKED",
      status: 409,
    });
  });

  it("creates block when valid", async () => {
    mockExists.mockResolvedValue(null);
    mockCreate.mockResolvedValue({ id: "block-1" });
    const result = await service.block("user-1", "user-2");
    expect(result).toEqual({ id: "block-1" });
    expect(mockCreate).toHaveBeenCalledWith("user-1", "user-2");
  });

  it("unblocks user", async () => {
    mockDelete.mockResolvedValue({ count: 1 });
    const result = await service.unblock("user-1", "user-2");
    expect(result).toEqual({ unblocked: true });
    expect(mockDelete).toHaveBeenCalledWith("user-1", "user-2");
  });
});

describe("BlockService error types", () => {
  it("uses ApiError for domain failures", async () => {
    const service = new BlockService();
    try {
      await service.block("a", "a");
    } catch (err) {
      expect(err).toBeInstanceOf(ApiError);
    }
  });
});
