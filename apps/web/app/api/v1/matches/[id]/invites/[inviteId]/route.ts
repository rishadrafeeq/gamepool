import { updateMatchInviteSchema } from "@gamepool/shared";

import { MatchInviteService } from "@/features/matches/services/match-invite.service";
import { parseBody, requireParam } from "@/server/http/parse";
import { withUser } from "@/server/http/handler";

const service = new MatchInviteService();

type Params = { params: Promise<{ id: string; inviteId: string }> };

export async function PATCH(request: Request, { params }: Params) {
  const { inviteId } = await params;
  requireParam(inviteId, "inviteId");
  return withUser(request as never, async ({ userId }) => {
    const body = await parseBody(request as never, updateMatchInviteSchema);
    return service.respond(userId, inviteId, body.action);
  });
}
