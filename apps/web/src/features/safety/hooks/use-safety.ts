"use client";

import { useMutation } from "@tanstack/react-query";
import type { CreateReportBody } from "@gamepool/shared";

import { apiFetch } from "@/lib/api-client";

export function useCreateReport() {
  return useMutation({
    mutationFn: (body: CreateReportBody) =>
      apiFetch("/api/v1/reports", { method: "POST", body: JSON.stringify(body) }),
  });
}

export function useBlockUser() {
  return useMutation({
    mutationFn: (blockedUserId: string) =>
      apiFetch("/api/v1/blocks", {
        method: "POST",
        body: JSON.stringify({ blockedUserId }),
      }),
  });
}

export function useUnblockUser() {
  return useMutation({
    mutationFn: (userId: string) =>
      apiFetch(`/api/v1/blocks/${userId}`, { method: "DELETE" }),
  });
}
