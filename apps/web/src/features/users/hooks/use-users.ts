"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { UpdateProfileBody, ReplaceUserSportsBody, ReplaceAvailabilityBody } from "@gamepool/shared";

import { apiFetch } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import type { User, AvailabilityWindow, UserSport } from "@/types";

export function useUpdateProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: UpdateProfileBody) =>
      apiFetch("/api/v1/users/me", { method: "PATCH", body: JSON.stringify(body) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.me }),
  });
}

export function useUserSports() {
  return useQuery({
    queryKey: [...queryKeys.me, "sports"],
    queryFn: async () => {
      const res = await apiFetch<UserSport[]>("/api/v1/users/me/sports");
      return res.data;
    },
  });
}

export function useReplaceSports() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: ReplaceUserSportsBody) =>
      apiFetch("/api/v1/users/me/sports", { method: "PUT", body: JSON.stringify(body) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.me });
      qc.invalidateQueries({ queryKey: [...queryKeys.me, "sports"] });
    },
  });
}

export function useAvailability() {
  return useQuery({
    queryKey: [...queryKeys.me, "availability"],
    queryFn: async () => {
      const res = await apiFetch<AvailabilityWindow[]>("/api/v1/users/me/availability");
      return res.data;
    },
  });
}

export function useReplaceAvailability() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: ReplaceAvailabilityBody) =>
      apiFetch("/api/v1/users/me/availability", { method: "PUT", body: JSON.stringify(body) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: [...queryKeys.me, "availability"] }),
  });
}

export function useUser(id: string) {
  return useQuery({
    queryKey: queryKeys.user(id),
    queryFn: async () => {
      const res = await apiFetch<User>(`/api/v1/users/${id}`);
      return res.data;
    },
    enabled: Boolean(id),
  });
}

export function usePlayers(filters: Record<string, string | number | undefined>) {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([k, v]) => {
    if (v !== undefined && v !== "") params.set(k, String(v));
  });
  return useQuery({
    queryKey: queryKeys.players(filters),
    queryFn: async () => {
      const res = await apiFetch<User[]>(`/api/v1/players?${params}`);
      return { items: res.data, meta: res.meta };
    },
  });
}
