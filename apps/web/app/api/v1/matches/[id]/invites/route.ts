import { createMatchInviteSchema } from "@gamepool/shared";

import { MatchInviteService } from "@/features/matches/services/match-invite.service";
import { parseBody, requireParam } from "@/server/http/parse";
import { withUser } from "@/server/http/handler";

const service = new MatchInviteService();

type Params = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: Params) {
  const { id } = await params;
  requireParam(id, "id");
  return withUser(request as never, ({ userId }) => service.listForMatch(userId, id));
}

export async function POST(request: Request, { params }: Params) {
  const { id } = await params;
  requireParam(id, "id");
  return withUser(request as never, async ({ userId }) => {
    const body = await parseBody(request as never, createMatchInviteSchema);
    return service.create(userId, id, body);
  }, 201);
}
