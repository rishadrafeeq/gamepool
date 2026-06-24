import { MatchJoinService } from "@/features/matches/services/match-join.service";
import { requireParam } from "@/server/http/parse";
import { withUser } from "@/server/http/handler";

const service = new MatchJoinService();

type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Params) {
  const { id } = await params;
  requireParam(id, "id");
  return withUser(request as never, ({ userId }) => service.leaveMatch(userId, id));
}
