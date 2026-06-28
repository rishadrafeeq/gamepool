"use client";

import { useQuery } from "@tanstack/react-query";

import { apiFetch } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { useAuthStore } from "@/stores/auth-store";
import type { User } from "@/types";

export function useMe(enabled = true) {
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  return useQuery({
    queryKey: queryKeys.me,
    enabled: enabled && !user,
    queryFn: async () => {
      const res = await apiFetch<User>("/api/v1/users/me");
      setUser(res.data);
      return res.data;
    },
    staleTime: 5 * 60_000,
    placeholderData: user ?? undefined,
  });
}
