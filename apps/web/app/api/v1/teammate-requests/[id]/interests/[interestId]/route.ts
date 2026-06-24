import { reviewTeammateInterestSchema } from "@gamepool/shared";

import { TeammateRequestService } from "@/features/teammates/services/teammate-request.service";
import { parseBody, requireParam } from "@/server/http/parse";
import { withUser } from "@/server/http/handler";

const service = new TeammateRequestService();

type Params = { params: Promise<{ id: string; interestId: string }> };

export async function PATCH(request: Request, { params }: Params) {
  const { id, interestId } = await params;
  requireParam(id, "id");
  requireParam(interestId, "interestId");
  return withUser(request as never, async ({ userId }) => {
    const body = await parseBody(request as never, reviewTeammateInterestSchema);
    return service.reviewInterest(userId, id, interestId, body.action);
  });
}
