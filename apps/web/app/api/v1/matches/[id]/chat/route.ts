import { createMatchChatMessageSchema } from "@gamepool/shared";

import { MatchChatService } from "@/features/matches/services/match-chat.service";
import { parseBody } from "@/server/http/parse";
import { withUser } from "@/server/http/handler";
import { jsonCreated, jsonSuccess } from "@/server/errors/api-error";

const service = new MatchChatService();

type Params = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: Params) {
  const { id } = await params;
  return withUser(request as never, async ({ userId }) => {
    const data = await service.listMessages(userId, id);
    return jsonSuccess(data);
  });
}

export async function POST(request: Request, { params }: Params) {
  const { id } = await params;
  return withUser(request as never, async ({ userId }) => {
    const body = await parseBody(request as never, createMatchChatMessageSchema);
    const message = await service.sendMessage(userId, id, body);
    return jsonCreated({ message });
  });
}
