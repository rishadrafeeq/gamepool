"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { apiFetch } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import type { Connection } from "@/types";

export function useConnections(status?: string) {
  const params = new URLSearchParams({ page: "1", limit: "50" });
  if (status) params.set("status", status);
  return useQuery({
    queryKey: queryKeys.connections({ status }),
    queryFn: async () => {
      const res = await apiFetch<Connection[]>(`/api/v1/connections?${params}`);
      return res.data;
    },
  });
}

export function useSendConnection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (recipientUserId: string) =>
      apiFetch("/api/v1/connections", {
        method: "POST",
        body: JSON.stringify({ recipientUserId }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["connections"] }),
  });
}

export function useRespondConnection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, action }: { id: string; action: "ACCEPT" | "DECLINE" }) =>
      apiFetch(`/api/v1/connections/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ action }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["connections"] }),
  });
}
