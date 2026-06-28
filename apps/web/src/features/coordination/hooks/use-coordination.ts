"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  CreateTeammateRequestBody,
  CreateOpponentRequestBody,
} from "@gamepool/shared";

import { apiFetch } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import type { TeammateRequest, OpponentRequest } from "@/types";

export function useTeammateRequests(filters: Record<string, string> = {}) {
  const params = new URLSearchParams({ page: "1", limit: "20", ...filters });
  return useQuery({
    queryKey: queryKeys.teammateRequests(filters),
    queryFn: async () => {
      const res = await apiFetch<TeammateRequest[]>(`/api/v1/teammate-requests?${params}`);
      return res.data;
    },
  });
}

export function useTeammateRequest(id: string) {
  return useQuery({
    queryKey: queryKeys.teammateRequest(id),
    queryFn: async () => {
      const res = await apiFetch<TeammateRequest>(`/api/v1/teammate-requests/${id}`);
      return res.data;
    },
    enabled: Boolean(id),
  });
}

export function useCreateTeammateRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateTeammateRequestBody) =>
      apiFetch("/api/v1/teammate-requests", { method: "POST", body: JSON.stringify(body) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["teammate-requests"] }),
  });
}

export function useExpressTeammateInterest(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => apiFetch(`/api/v1/teammate-requests/${id}/interests`, { method: "POST", body: "{}" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.teammateRequest(id) }),
  });
}

export function useOpponentRequests(filters: Record<string, string> = {}) {
  const params = new URLSearchParams({ page: "1", limit: "20", ...filters });
  return useQuery({
    queryKey: queryKeys.opponentRequests(filters),
    queryFn: async () => {
      const res = await apiFetch<OpponentRequest[]>(`/api/v1/opponent-requests?${params}`);
      return res.data;
    },
  });
}

export function useOpponentRequest(id: string) {
  return useQuery({
    queryKey: queryKeys.opponentRequest(id),
    queryFn: async () => {
      const res = await apiFetch<OpponentRequest>(`/api/v1/opponent-requests/${id}`);
      return res.data;
    },
    enabled: Boolean(id),
  });
}

export function useCreateOpponentRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateOpponentRequestBody) =>
      apiFetch("/api/v1/opponent-requests", { method: "POST", body: JSON.stringify(body) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["opponent-requests"] }),
  });
}

export function useExpressOpponentInterest(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => apiFetch(`/api/v1/opponent-requests/${id}/interests`, { method: "POST", body: "{}" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.opponentRequest(id) }),
  });
}

export function useReviewTeammateInterest(requestId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ interestId, action }: { interestId: string; action: "APPROVE" | "DECLINE" }) =>
      apiFetch(`/api/v1/teammate-requests/${requestId}/interests/${interestId}`, {
        method: "PATCH",
        body: JSON.stringify({ action }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.teammateRequest(requestId) });
      qc.invalidateQueries({ queryKey: ["teammate-requests"] });
    },
  });
}

export function useReviewOpponentInterest(requestId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ interestId, action }: { interestId: string; action: "APPROVE" | "DECLINE" }) =>
      apiFetch(`/api/v1/opponent-requests/${requestId}/interests/${interestId}`, {
        method: "PATCH",
        body: JSON.stringify({ action }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.opponentRequest(requestId) });
      qc.invalidateQueries({ queryKey: ["opponent-requests"] });
    },
  });
}

export function usePairOpponentRequest(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (opponentRequestId: string) =>
      apiFetch(`/api/v1/opponent-requests/${id}/pair`, {
        method: "POST",
        body: JSON.stringify({ opponentRequestId }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.opponentRequest(id) }),
  });
}
