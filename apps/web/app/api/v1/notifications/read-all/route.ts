import { markAllNotificationsReadSchema } from "@gamepool/shared";

import { NotificationService } from "@/features/notifications/services/notification.service";
import { parseBody } from "@/server/http/parse";
import { withUser } from "@/server/http/handler";

const service = new NotificationService();

export async function POST(request: Request) {
  return withUser(request as never, async ({ userId }) => {
    await parseBody(request as never, markAllNotificationsReadSchema).catch(() => ({}));
    return service.markAllRead(userId);
  });
}
