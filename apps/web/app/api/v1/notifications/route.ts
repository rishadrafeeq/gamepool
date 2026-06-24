import { listNotificationsSchema } from "@gamepool/shared";

import { NotificationService } from "@/features/notifications/services/notification.service";
import { parseQuery } from "@/server/http/parse";
import { withUserMeta } from "@/server/http/handler";

const service = new NotificationService();

export async function GET(request: Request) {
  return withUserMeta(request as never, async ({ userId, request: req }) => {
    const query = parseQuery(req, listNotificationsSchema);
    const result = await service.list(userId, query.page, query.limit);
    return { data: result.items, meta: result.meta };
  });
}
