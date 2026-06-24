import { updateOpponentRequestSchema } from "@gamepool/shared";

import { OpponentRequestService } from "@/features/opponents/services/opponent-request.service";
import { parseBody, requireParam } from "@/server/http/parse";
import { withUser } from "@/server/http/handler";

const service = new OpponentRequestService();

type Params = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: Params) {
  const { id } = await params;
  requireParam(id, "id");
  return withUser(request as never, () => service.getById(id));
}

export async function PATCH(request: Request, { params }: Params) {
  const { id } = await params;
  requireParam(id, "id");
  return withUser(request as never, async ({ userId }) => {
    const body = await parseBody(request as never, updateOpponentRequestSchema);
    return service.update(userId, id, body);
  });
}

export async function DELETE(request: Request, { params }: Params) {
  const { id } = await params;
  requireParam(id, "id");
  return withUser(request as never, ({ userId }) => service.cancel(userId, id));
}
