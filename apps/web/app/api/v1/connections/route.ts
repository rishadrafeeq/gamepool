import {
  createConnectionSchema,
  listConnectionsSchema,
} from "@gamepool/shared";

import { ConnectionService } from "@/features/connections/services/connection.service";
import { parseBody, parseQuery } from "@/server/http/parse";
import { withUser, withUserMeta } from "@/server/http/handler";

const service = new ConnectionService();

export async function GET(request: Request) {
  return withUserMeta(request as never, async ({ userId, request: req }) => {
    const query = parseQuery(req, listConnectionsSchema);
    const result = await service.list(userId, query.status, query.page, query.limit);
    return { data: result.items, meta: result.meta };
  });
}

export async function POST(request: Request) {
  return withUser(request as never, async ({ userId }) => {
    const body = await parseBody(request as never, createConnectionSchema);
    return service.send(userId, body);
  }, 201);
}
