"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { CreateMatchBody, UpdateMatchBody } from "@gamepool/shared";

import { apiFetch } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import type { Match, JoinRequest, MatchInvite, MatchParticipant } from "@/types";

export function useMatches(filters: Record<string, string | number | undefined> = {}) {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([k, v]) => {
    if (v !== undefined && v !== "") params.set(k, String(v));
  });
  return useQuery({
    queryKey: queryKeys.matches(filters),
    queryFn: async () => {
      const res = await apiFetch<Match[]>(`/api/v1/matches?${params}`);
      return { items: res.data, meta: res.meta };
    },
  });
}

export function useMatch(id: string) {
  return useQuery({
    queryKey: queryKeys.match(id),
    queryFn: async () => {
      const res = await apiFetch<Match>(`/api/v1/matches/${id}`);
      return res.data;
    },
    enabled: Boolean(id),
  });
}

export function useCreateMatch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateMatchBody) =>
      apiFetch<Match>("/api/v1/matches", { method: "POST", body: JSON.stringify(body) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["matches"] }),
  });
}

export function useUpdateMatch(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: UpdateMatchBody) =>
      apiFetch<Match>(`/api/v1/matches/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.match(id) });
      qc.invalidateQueries({ queryKey: ["matches"] });
    },
  });
}

export function usePublishMatch(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => apiFetch(`/api/v1/matches/${id}/publish`, { method: "POST" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.match(id) });
      qc.invalidateQueries({ queryKey: ["matches"] });
    },
  });
}

export function useCancelMatch(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => apiFetch(`/api/v1/matches/${id}/cancel`, { method: "POST" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.match(id) }),
  });
}

export function useJoinRequest(matchId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (message?: string) =>
      apiFetch(`/api/v1/matches/${matchId}/join-requests`, {
        method: "POST",
        body: JSON.stringify({ message }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.match(matchId) }),
  });
}

export function useJoinRequests(matchId: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.matchJoinRequests(matchId),
    queryFn: async () => {
      const res = await apiFetch<JoinRequest[]>(`/api/v1/matches/${matchId}/join-requests`);
      return res.data;
    },
    enabled: Boolean(matchId) && enabled,
  });
}

export function useReviewJoinRequest(matchId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ requestId, action }: { requestId: string; action: "APPROVE" | "DECLINE" }) =>
      apiFetch(`/api/v1/matches/${matchId}/join-requests/${requestId}`, {
        method: "PATCH",
        body: JSON.stringify({ action }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.matchJoinRequests(matchId) });
      qc.invalidateQueries({ queryKey: queryKeys.match(matchId) });
      qc.invalidateQueries({ queryKey: queryKeys.matchParticipants(matchId) });
    },
  });
}

export function useJoinWaitlist(matchId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => apiFetch(`/api/v1/matches/${matchId}/waitlist`, { method: "POST" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.match(matchId) }),
  });
}

export function useLeaveMatch(matchId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => apiFetch(`/api/v1/matches/${matchId}/leave`, { method: "POST" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.match(matchId) }),
  });
}

export function useMatchParticipants(matchId: string) {
  return useQuery({
    queryKey: queryKeys.matchParticipants(matchId),
    queryFn: async () => {
      const res = await apiFetch<MatchParticipant[]>(`/api/v1/matches/${matchId}/participants`);
      return res.data;
    },
    enabled: Boolean(matchId),
  });
}

export function useMatchInvites(matchId: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.matchInvites(matchId),
    queryFn: async () => {
      const res = await apiFetch<MatchInvite[]>(`/api/v1/matches/${matchId}/invites`);
      return res.data;
    },
    enabled: Boolean(matchId) && enabled,
  });
}

export function useCreateInvite(matchId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { inviteeUserId: string; message?: string }) =>
      apiFetch(`/api/v1/matches/${matchId}/invites`, {
        method: "POST",
        body: JSON.stringify(body),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.matchInvites(matchId) }),
  });
}

export function useRespondInvite(matchId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ inviteId, action }: { inviteId: string; action: "ACCEPT" | "DECLINE" }) =>
      apiFetch(`/api/v1/matches/${matchId}/invites/${inviteId}`, {
        method: "PATCH",
        body: JSON.stringify({ action }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.match(matchId) });
      qc.invalidateQueries({ queryKey: queryKeys.matchInvites(matchId) });
    },
  });
}
