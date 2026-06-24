"use client";

import { create } from "zustand";
import type { User } from "@/types";

type AuthStore = {
  firebaseUid: string | null;
  user: User | null;
  isInitialized: boolean;
  setFirebaseUid: (uid: string | null) => void;
  setUser: (user: User | null) => void;
  setInitialized: (value: boolean) => void;
  reset: () => void;
};

export const useAuthStore = create<AuthStore>((set) => ({
  firebaseUid: null,
  user: null,
  isInitialized: false,
  setFirebaseUid: (uid) => set({ firebaseUid: uid }),
  setUser: (user) => set({ user }),
  setInitialized: (value) => set({ isInitialized: value }),
  reset: () => set({ firebaseUid: null, user: null, isInitialized: true }),
}));
