import { createMatchSchema, listMatchesSchema } from "@gamepool/shared";

import { MatchService } from "@/features/matches/services/match.service";
import { parseBody, parseQuery } from "@/server/http/parse";
import { withUser, withUserMeta } from "@/server/http/handler";

const service = new MatchService();

export async function GET(request: Request) {
  return withUserMeta(request as never, async ({ userId, request: req }) => {
    const query = parseQuery(req, listMatchesSchema);
    const result = await service.browse(userId, query);
    return { data: result.items, meta: result.meta };
  });
}

export async function POST(request: Request) {
  return withUser(request as never, async ({ userId }) => {
    const body = await parseBody(request as never, createMatchSchema);
    return service.create(userId, body);
  }, 201);
}
