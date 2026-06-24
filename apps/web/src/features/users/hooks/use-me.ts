"use client";

import { useQuery } from "@tanstack/react-query";

import { apiFetch } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { useAuthStore } from "@/stores/auth-store";
import type { User } from "@/types";

export function useMe(enabled = true) {
  const setUser = useAuthStore((s) => s.setUser);
  return useQuery({
    queryKey: queryKeys.me,
    enabled,
    queryFn: async () => {
      const res = await apiFetch<User>("/api/v1/users/me");
      setUser(res.data);
      return res.data;
    },
  });
}
