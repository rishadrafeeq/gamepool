import { z } from "zod";

import {
  matchStatusSchema,
  matchVisibilitySchema,
  paginationSchema,
  skillLevelSchema,
} from "./common.schema";

export const createMatchSchema = z.object({
  sportId: z.string().uuid(),
  title: z.string().min(3).max(200),
  format: z.string().min(1).max(50),
  notes: z.string().max(2000).optional().nullable(),
  visibility: matchVisibilitySchema.default("PUBLIC"),
  skillLevelExpected: skillLevelSchema.optional().nullable(),
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime().optional().nullable(),
  durationMinutes: z.number().int().min(15).max(480).optional().nullable(),
  venueName: z.string().min(1).max(200),
  venueAddress: z.string().max(500).optional().nullable(),
  venueLatitude: z.number().optional().nullable(),
  venueLongitude: z.number().optional().nullable(),
  city: z.string().min(1).max(100),
  area: z.string().max(100).optional().nullable(),
  maxParticipants: z.number().int().min(2).max(100),
  waitlistEnabled: z.boolean().default(false),
  leaveCutoffHours: z.number().int().min(0).max(72).default(2),
  requiresJoinApproval: z.boolean().default(true),
});

export const updateMatchSchema = createMatchSchema
  .partial()
  .omit({ sportId: true });

export const listMatchesSchema = paginationSchema.extend({
  sportId: z.string().uuid().optional(),
  city: z.string().max(100).optional(),
  area: z.string().max(100).optional(),
  status: matchStatusSchema.optional(),
  skillLevel: skillLevelSchema.optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
});

export const createJoinRequestSchema = z.object({
  message: z.string().max(500).optional().nullable(),
});

export const reviewJoinRequestSchema = z.object({
  action: z.enum(["APPROVE", "DECLINE"]),
});

export const createMatchInviteSchema = z.object({
  inviteeUserId: z.string().uuid(),
  message: z.string().max(500).optional().nullable(),
  expiresAt: z.string().datetime().optional().nullable(),
});

export const updateMatchInviteSchema = z.object({
  action: z.enum(["ACCEPT", "DECLINE"]),
});

export const removeParticipantSchema = z.object({
  reason: z.string().max(500).optional().nullable(),
});

export type CreateMatchBody = z.output<typeof createMatchSchema>;
export type UpdateMatchBody = z.infer<typeof updateMatchSchema>;
export type ListMatchesQuery = z.output<typeof listMatchesSchema>;
export const createMatchChatMessageSchema = z.object({
  body: z.string().min(1).max(2000),
});

export type CreateMatchChatMessageBody = z.infer<typeof createMatchChatMessageSchema>;
