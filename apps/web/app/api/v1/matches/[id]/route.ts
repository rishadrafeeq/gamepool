import { updateMatchSchema } from "@gamepool/shared";

import { MatchService } from "@/features/matches/services/match.service";
import { parseBody, requireParam } from "@/server/http/parse";
import { withUser } from "@/server/http/handler";

const service = new MatchService();

type Params = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: Params) {
  const { id } = await params;
  requireParam(id, "id");
  return withUser(request as never, ({ userId }) => service.getById(userId, id));
}

export async function PATCH(request: Request, { params }: Params) {
  const { id } = await params;
  requireParam(id, "id");
  return withUser(request as never, async ({ userId }) => {
    const body = await parseBody(request as never, updateMatchSchema);
    return service.update(userId, id, body);
  });
}
