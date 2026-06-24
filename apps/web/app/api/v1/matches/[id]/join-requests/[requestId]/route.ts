import { reviewJoinRequestSchema } from "@gamepool/shared";

import { MatchJoinService } from "@/features/matches/services/match-join.service";
import { parseBody, requireParam } from "@/server/http/parse";
import { withUser } from "@/server/http/handler";

const service = new MatchJoinService();

type Params = { params: Promise<{ id: string; requestId: string }> };

export async function PATCH(request: Request, { params }: Params) {
  const { id, requestId } = await params;
  requireParam(id, "id");
  requireParam(requestId, "requestId");
  return withUser(request as never, async ({ userId }) => {
    const body = await parseBody(request as never, reviewJoinRequestSchema);
    return service.reviewRequest(userId, id, requestId, body.action);
  });
}
