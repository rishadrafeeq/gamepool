"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { apiFetch } from "@/lib/api-client";

export type MatchChatMessage = {
  id: string;
  body: string;
  createdAt: string;
  user: {
    id: string;
    displayName: string;
    avatarUrl: string | null;
  };
};

export function useMatchChat(matchId: string) {
  return useQuery({
    queryKey: ["match-chat", matchId],
    queryFn: async () => {
      const res = await apiFetch<{
        messages: MatchChatMessage[];
        expiresAt: string;
      }>(`/api/v1/matches/${matchId}/chat`);
      return res.data;
    },
    enabled: Boolean(matchId),
    refetchInterval: 5_000,
  });
}

export function useSendMatchChatMessage(matchId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: string) =>
      apiFetch<{ message: MatchChatMessage }>(`/api/v1/matches/${matchId}/chat`, {
        method: "POST",
        body: JSON.stringify({ body }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["match-chat", matchId] }),
  });
}
