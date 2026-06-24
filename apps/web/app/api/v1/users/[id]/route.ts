import { UserService } from "@/features/users/services/user.service";
import { requireParam } from "@/server/http/parse";
import { withUser } from "@/server/http/handler";

const service = new UserService();

type Params = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: Params) {
  const { id } = await params;
  requireParam(id, "id");
  return withUser(request as never, ({ userId }) => service.getPublicProfile(userId, id));
}
