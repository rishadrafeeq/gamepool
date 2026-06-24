import { playerSearchSchema } from "@gamepool/shared";

import { UserService } from "@/features/users/services/user.service";
import { parseQuery } from "@/server/http/parse";
import { withUserMeta } from "@/server/http/handler";

const service = new UserService();

export async function GET(request: Request) {
  return withUserMeta(request as never, async ({ userId, request: req }) => {
    const query = parseQuery(req, playerSearchSchema);
    const result = await service.searchPlayers(userId, query);
    return { data: result.items, meta: result.meta };
  });
}
