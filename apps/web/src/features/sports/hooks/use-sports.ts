"use client";

import { useQuery } from "@tanstack/react-query";

import { apiFetch } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import type { Sport } from "@/types";

export function useSports() {
  return useQuery({
    queryKey: queryKeys.sports,
    queryFn: async () => {
      const res = await apiFetch<Sport[]>("/api/v1/sports", { auth: false });
      return res.data;
    },
  });
}
