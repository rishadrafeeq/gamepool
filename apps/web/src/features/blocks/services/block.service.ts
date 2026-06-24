import { BlockRepository } from "@/features/blocks/repositories/block.repository";
import { ApiError } from "@/server/errors/api-error";

export class BlockService {
  constructor(private readonly blocks = new BlockRepository()) {}

  async block(blockerUserId: string, blockedUserId: string) {
    if (blockerUserId === blockedUserId) {
      throw new ApiError(400, "INVALID_REQUEST", "Cannot block yourself");
    }

    const existing = await this.blocks.exists(blockerUserId, blockedUserId);
    if (existing) throw new ApiError(409, "ALREADY_BLOCKED", "User already blocked");

    return this.blocks.create(blockerUserId, blockedUserId);
  }

  async unblock(blockerUserId: string, blockedUserId: string) {
    await this.blocks.delete(blockerUserId, blockedUserId);
    return { unblocked: true };
  }
}
