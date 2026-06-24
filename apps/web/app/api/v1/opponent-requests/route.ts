import {
  createOpponentRequestSchema,
  listOpponentRequestsSchema,
} from "@gamepool/shared";

import { OpponentRequestService } from "@/features/opponents/services/opponent-request.service";
import { parseBody, parseQuery } from "@/server/http/parse";
import { withUser, withUserMeta } from "@/server/http/handler";

const service = new OpponentRequestService();

export async function GET(request: Request) {
  return withUserMeta(request as never, async ({ request: req }) => {
    const query = parseQuery(req, listOpponentRequestsSchema);
    const result = await service.list(query);
    return { data: result.items, meta: result.meta };
  });
}

export async function POST(request: Request) {
  return withUser(request as never, async ({ userId }) => {
    const body = await parseBody(request as never, createOpponentRequestSchema);
    return service.create(userId, body);
  }, 201);
}
