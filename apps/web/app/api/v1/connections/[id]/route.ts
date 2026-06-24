import { updateConnectionSchema } from "@gamepool/shared";

import { ConnectionService } from "@/features/connections/services/connection.service";
import { parseBody, requireParam } from "@/server/http/parse";
import { withUser } from "@/server/http/handler";

const service = new ConnectionService();

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  const { id } = await params;
  requireParam(id, "id");
  return withUser(request as never, async ({ userId }) => {
    const body = await parseBody(request as never, updateConnectionSchema);
    return service.respond(userId, id, body);
  });
}
