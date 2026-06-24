import { createBlockSchema } from "@gamepool/shared";

import { BlockService } from "@/features/blocks/services/block.service";
import { parseBody } from "@/server/http/parse";
import { withUser } from "@/server/http/handler";

const service = new BlockService();

export async function POST(request: Request) {
  return withUser(request as never, async ({ userId }) => {
    const body = await parseBody(request as never, createBlockSchema);
    return service.block(userId, body.blockedUserId);
  }, 201);
}
