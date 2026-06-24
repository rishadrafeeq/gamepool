import { removeParticipantSchema } from "@gamepool/shared";

import { MatchJoinService } from "@/features/matches/services/match-join.service";
import { parseBody, requireParam } from "@/server/http/parse";
import { withUser } from "@/server/http/handler";

const service = new MatchJoinService();

type Params = { params: Promise<{ id: string; userId: string }> };

export async function DELETE(request: Request, { params }: Params) {
  const { id, userId: targetUserId } = await params;
  requireParam(id, "id");
  requireParam(targetUserId, "userId");
  return withUser(request as never, async ({ userId }) => {
    const body = await parseBody(request as never, removeParticipantSchema);
    return service.removeParticipant(userId, id, targetUserId, body.reason);
  });
}
