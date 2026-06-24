import { replaceAvailabilitySchema } from "@gamepool/shared";

import { UserService } from "@/features/users/services/user.service";
import { parseBody } from "@/server/http/parse";
import { withUser } from "@/server/http/handler";

const service = new UserService();

export async function GET(request: Request) {
  return withUser(request as never, ({ userId }) => service.listAvailability(userId));
}

export async function PUT(request: Request) {
  return withUser(request as never, async ({ userId }) => {
    const body = await parseBody(request as never, replaceAvailabilitySchema);
    return service.replaceAvailability(userId, body);
  });
}
