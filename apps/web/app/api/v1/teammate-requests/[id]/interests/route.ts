import { TeammateRequestService } from "@/features/teammates/services/teammate-request.service";
import { requireParam } from "@/server/http/parse";
import { withUser } from "@/server/http/handler";

const service = new TeammateRequestService();

type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Params) {
  const { id } = await params;
  requireParam(id, "id");
  return withUser(request as never, ({ userId }) => service.expressInterest(userId, id), 201);
}
