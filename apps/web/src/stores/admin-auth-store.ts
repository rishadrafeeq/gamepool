"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

import type { AdminSession } from "@/features/admin/types";

type AdminAuthStore = {
  session: AdminSession | null;
  setSession: (session: AdminSession | null) => void;
  clear: () => void;
};

export const useAdminAuthStore = create<AdminAuthStore>()(
  persist(
    (set) => ({
      session: null,
      setSession: (session) => set({ session }),
      clear: () => set({ session: null }),
    }),
    { name: "gamepool-admin-auth" },
  ),
);

export function getAdminToken(): string | null {
  return useAdminAuthStore.getState().session?.token ?? null;
}
