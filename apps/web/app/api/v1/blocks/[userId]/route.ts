import { requireParam } from "@/server/http/parse";
import { withUserNoContent } from "@/server/http/handler";
import { BlockService } from "@/features/blocks/services/block.service";

const service = new BlockService();

type Params = { params: Promise<{ userId: string }> };

export async function DELETE(request: Request, { params }: Params) {
  const { userId: blockedUserId } = await params;
  requireParam(blockedUserId, "userId");
  return withUserNoContent(request as never, async ({ userId }) => {
    await service.unblock(userId, blockedUserId);
  });
}
