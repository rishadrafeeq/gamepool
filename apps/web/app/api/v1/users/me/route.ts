import { parseBody } from "@/server/http/parse";
import { withUser } from "@/server/http/handler";
import { UserService } from "@/features/users/services/user.service";
import { updateProfileSchema } from "@gamepool/shared";

const service = new UserService();

export async function GET(request: Request) {
  return withUser(request as never, ({ userId }) => service.getMe(userId));
}

export async function PATCH(request: Request) {
  return withUser(request as never, async ({ userId }) => {
    const body = await parseBody(request as never, updateProfileSchema);
    return service.updateProfile(userId, body);
  });
}
