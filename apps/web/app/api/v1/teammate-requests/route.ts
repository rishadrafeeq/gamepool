import {
  createTeammateRequestSchema,
  listTeammateRequestsSchema,
} from "@gamepool/shared";

import { TeammateRequestService } from "@/features/teammates/services/teammate-request.service";
import { parseBody, parseQuery } from "@/server/http/parse";
import { withUser, withUserMeta } from "@/server/http/handler";

const service = new TeammateRequestService();

export async function GET(request: Request) {
  return withUserMeta(request as never, async ({ request: req }) => {
    const query = parseQuery(req, listTeammateRequestsSchema);
    const result = await service.list(query);
    return { data: result.items, meta: result.meta };
  });
}

export async function POST(request: Request) {
  return withUser(request as never, async ({ userId }) => {
    const body = await parseBody(request as never, createTeammateRequestSchema);
    return service.create(userId, body);
  }, 201);
}
