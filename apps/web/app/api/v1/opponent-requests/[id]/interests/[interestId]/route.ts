import { reviewOpponentInterestSchema } from "@gamepool/shared";

import { OpponentRequestService } from "@/features/opponents/services/opponent-request.service";
import { parseBody, requireParam } from "@/server/http/parse";
import { withUser } from "@/server/http/handler";

const service = new OpponentRequestService();

type Params = { params: Promise<{ id: string; interestId: string }> };

export async function PATCH(request: Request, { params }: Params) {
  const { id, interestId } = await params;
  requireParam(id, "id");
  requireParam(interestId, "interestId");
  return withUser(request as never, async ({ userId }) => {
    const body = await parseBody(request as never, reviewOpponentInterestSchema);
    return service.reviewInterest(userId, id, interestId, body.action);
  });
}
