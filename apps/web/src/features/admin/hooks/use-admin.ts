"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { AdminLoginBody, AdminUpdateMatchBody } from "@gamepool/shared";

import { adminFetch } from "@/features/admin/lib/admin-api";
import type {
  AdminMatch,
  AdminReport,
  AdminSession,
  AdminUser,
  AuditEvent,
  DashboardSummary,
  PaginatedMeta,
} from "@/features/admin/types";

export const adminQueryKeys = {
  summary: ["admin", "summary"] as const,
  activity: ["admin", "activity"] as const,
  users: (filters: Record<string, unknown>) => ["admin", "users", filters] as const,
  user: (id: string) => ["admin", "user", id] as const,
  matches: (filters: Record<string, unknown>) => ["admin", "matches", filters] as const,
  match: (id: string) => ["admin", "match", id] as const,
  reports: (filters: Record<string, unknown>) => ["admin", "reports", filters] as const,
  report: (id: string) => ["admin", "report", id] as const,
};

export function useAdminLogin() {
  return useMutation({
    mutationFn: async (body: AdminLoginBody) => {
      const res = await adminFetch<AdminSession>("/api/v1/admin/auth/login", {
        method: "POST",
        body: JSON.stringify(body),
        headers: {},
      });
      return res.data;
    },
  });
}

export function useDashboardSummary() {
  return useQuery({
    queryKey: adminQueryKeys.summary,
    queryFn: async () => {
      const res = await adminFetch<DashboardSummary>("/api/v1/admin/dashboard/summary");
      return res.data;
    },
  });
}

export function useRecentActivity() {
  return useQuery({
    queryKey: adminQueryKeys.activity,
    queryFn: async () => {
      const res = await adminFetch<AuditEvent[]>("/api/v1/admin/dashboard/activity");
      return res.data;
    },
  });
}

export function useAdminUsers(filters: {
  page: number;
  limit: number;
  q?: string;
  status?: string;
}) {
  const params = new URLSearchParams({
    page: String(filters.page),
    limit: String(filters.limit),
  });
  if (filters.q) params.set("q", filters.q);
  if (filters.status) params.set("status", filters.status);

  return useQuery({
    queryKey: adminQueryKeys.users(filters),
    queryFn: async () => {
      const res = await adminFetch<AdminUser[]>(`/api/v1/admin/users?${params}`);
      return { items: res.data, meta: res.meta as PaginatedMeta };
    },
  });
}

export function useAdminUser(id: string) {
  return useQuery({
    queryKey: adminQueryKeys.user(id),
    queryFn: async () => {
      const res = await adminFetch<AdminUser>(`/api/v1/admin/users/${id}`);
      return res.data;
    },
    enabled: Boolean(id),
  });
}

export function useSuspendUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, reason }: { userId: string; reason?: string }) =>
      adminFetch(`/api/v1/admin/users/${userId}/suspend`, {
        method: "POST",
        body: JSON.stringify({ reason }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "users"] });
      qc.invalidateQueries({ queryKey: ["admin", "user"] });
      qc.invalidateQueries({ queryKey: adminQueryKeys.summary });
      qc.invalidateQueries({ queryKey: adminQueryKeys.activity });
    },
  });
}

export function useReinstateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) =>
      adminFetch(`/api/v1/admin/users/${userId}/reinstate`, { method: "POST" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "users"] });
      qc.invalidateQueries({ queryKey: ["admin", "user"] });
      qc.invalidateQueries({ queryKey: adminQueryKeys.summary });
      qc.invalidateQueries({ queryKey: adminQueryKeys.activity });
    },
  });
}

export function useAdminMatches(filters: {
  page: number;
  limit: number;
  status?: string;
  sportId?: string;
}) {
  const params = new URLSearchParams({
    page: String(filters.page),
    limit: String(filters.limit),
  });
  if (filters.status) params.set("status", filters.status);
  if (filters.sportId) params.set("sportId", filters.sportId);

  return useQuery({
    queryKey: adminQueryKeys.matches(filters),
    queryFn: async () => {
      const res = await adminFetch<AdminMatch[]>(`/api/v1/admin/matches?${params}`);
      return { items: res.data, meta: res.meta as PaginatedMeta };
    },
  });
}

export function useAdminMatch(id: string) {
  return useQuery({
    queryKey: adminQueryKeys.match(id),
    queryFn: async () => {
      const res = await adminFetch<AdminMatch>(`/api/v1/admin/matches/${id}`);
      return res.data;
    },
    enabled: Boolean(id),
  });
}

export function useUpdateAdminMatch(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: AdminUpdateMatchBody) =>
      adminFetch(`/api/v1/admin/matches/${id}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: adminQueryKeys.match(id) });
      qc.invalidateQueries({ queryKey: ["admin", "matches"] });
      qc.invalidateQueries({ queryKey: adminQueryKeys.summary });
      qc.invalidateQueries({ queryKey: adminQueryKeys.activity });
    },
  });
}

export function useAdminReports(filters: { page: number; limit: number; status?: string }) {
  const params = new URLSearchParams({
    page: String(filters.page),
    limit: String(filters.limit),
  });
  if (filters.status) params.set("status", filters.status);

  return useQuery({
    queryKey: adminQueryKeys.reports(filters),
    queryFn: async () => {
      const res = await adminFetch<AdminReport[]>(`/api/v1/admin/reports?${params}`);
      return { items: res.data, meta: res.meta as PaginatedMeta };
    },
  });
}

export function useAdminReport(id: string) {
  return useQuery({
    queryKey: adminQueryKeys.report(id),
    queryFn: async () => {
      const res = await adminFetch<AdminReport>(`/api/v1/admin/reports/${id}`);
      return res.data;
    },
    enabled: Boolean(id),
  });
}

export function useReviewReport(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: {
      status: "UNDER_REVIEW" | "RESOLVED" | "DISMISSED";
      resolutionNotes?: string;
    }) =>
      adminFetch(`/api/v1/admin/reports/${id}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: adminQueryKeys.report(id) });
      qc.invalidateQueries({ queryKey: ["admin", "reports"] });
      qc.invalidateQueries({ queryKey: adminQueryKeys.summary });
      qc.invalidateQueries({ queryKey: adminQueryKeys.activity });
    },
  });
}
