import { createJoinRequestSchema } from "@gamepool/shared";

import { MatchJoinService } from "@/features/matches/services/match-join.service";
import { parseBody, requireParam } from "@/server/http/parse";
import { withUser } from "@/server/http/handler";

const service = new MatchJoinService();

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
    const body = await parseBody(request as never, createJoinRequestSchema);
    return service.createRequest(userId, id, body.message);
  }, 201);
}
