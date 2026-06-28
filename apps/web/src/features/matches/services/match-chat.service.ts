import type { CreateMatchChatMessageBody } from "@gamepool/shared";

import { MatchChatRepository } from "@/features/matches/repositories/match-chat.repository";
import { MatchRepository } from "@/features/matches/repositories/match.repository";
import { ParticipantRepository } from "@/features/matches/repositories/participant.repository";
import { ApiError } from "@/server/errors/api-error";

/** Chat stays open until this many days after the match ends */
export const MATCH_CHAT_RETENTION_DAYS = 7;

export function getMatchChatExpiresAt(match: {
  startsAt: Date;
  endsAt: Date | null;
  durationMinutes: number | null;
}): Date {
  const endMs =
    match.endsAt?.getTime() ??
    match.startsAt.getTime() + (match.durationMinutes ?? 120) * 60_000;
  return new Date(endMs + MATCH_CHAT_RETENTION_DAYS * 24 * 60 * 60 * 1000);
}

export class MatchChatService {
  constructor(
    private readonly messages = new MatchChatRepository(),
    private readonly matches = new MatchRepository(),
    private readonly participants = new ParticipantRepository(),
  ) {}

  private async assertCanAccess(userId: string, matchId: string) {
    const match = await this.matches.findById(matchId);
    if (!match) throw new ApiError(404, "NOT_FOUND", "Match not found");

    if (["CANCELLED", "DRAFT"].includes(match.status)) {
      throw new ApiError(400, "CHAT_UNAVAILABLE", "Chat is not available for this match");
    }

    const expiresAt = getMatchChatExpiresAt(match);
    if (Date.now() > expiresAt.getTime()) {
      throw new ApiError(410, "CHAT_EXPIRED", "This match chat has been closed");
    }

    const isHost = match.hostUserId === userId;
    if (isHost) return match;

    const participant = await this.participants.findActive(matchId, userId);
    if (!participant || participant.status !== "CONFIRMED") {
      throw new ApiError(403, "FORBIDDEN", "Only confirmed players can use match chat");
    }

    return match;
  }

  async listMessages(userId: string, matchId: string) {
    const match = await this.assertCanAccess(userId, matchId);
    const messages = await this.messages.listByMatch(matchId);
    return {
      messages: messages.map((m) => ({
        id: m.id,
        body: m.body,
        createdAt: m.createdAt.toISOString(),
        user: {
          id: m.user.id,
          displayName: m.user.profile?.displayName ?? "Player",
          avatarUrl: m.user.profile?.avatarUrl ?? null,
        },
      })),
      expiresAt: getMatchChatExpiresAt(match).toISOString(),
    };
  }

  async sendMessage(userId: string, matchId: string, body: CreateMatchChatMessageBody) {
    await this.assertCanAccess(userId, matchId);
    const message = await this.messages.create(matchId, userId, body.body.trim());
    return {
      id: message.id,
      body: message.body,
      createdAt: message.createdAt.toISOString(),
      user: {
        id: message.user.id,
        displayName: message.user.profile?.displayName ?? "Player",
        avatarUrl: message.user.profile?.avatarUrl ?? null,
      },
    };
  }
}
