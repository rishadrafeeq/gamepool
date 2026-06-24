"use client";

import { create } from "zustand";
import type { MatchVisibility, SkillLevel } from "@/types";

export type CreateMatchDraft = {
  sportId: string;
  title: string;
  format: string;
  notes?: string;
  visibility: MatchVisibility;
  skillLevelExpected: SkillLevel;
  startsAt: string;
  endsAt?: string;
  durationMinutes?: number;
  venueName: string;
  venueAddress?: string;
  city: string;
  area?: string;
  maxParticipants: number;
  waitlistEnabled: boolean;
  leaveCutoffHours: number;
  requiresJoinApproval: boolean;
};

type CreateMatchStore = {
  draft: Partial<CreateMatchDraft>;
  matchId: string | null;
  step: 1 | 2 | 3;
  setDraft: (patch: Partial<CreateMatchDraft>) => void;
  setMatchId: (id: string | null) => void;
  setStep: (step: 1 | 2 | 3) => void;
  reset: () => void;
};

const initialDraft: Partial<CreateMatchDraft> = {
  visibility: "PUBLIC",
  skillLevelExpected: "INTERMEDIATE",
  maxParticipants: 10,
  waitlistEnabled: true,
  leaveCutoffHours: 2,
  requiresJoinApproval: true,
};

export const useCreateMatchStore = create<CreateMatchStore>((set) => ({
  draft: initialDraft,
  matchId: null,
  step: 1,
  setDraft: (patch) => set((s) => ({ draft: { ...s.draft, ...patch } })),
  setMatchId: (matchId) => set({ matchId }),
  setStep: (step) => set({ step }),
  reset: () => set({ draft: initialDraft, matchId: null, step: 1 }),
}));
