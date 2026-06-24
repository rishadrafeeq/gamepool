import { z } from "zod";

import { interestActionSchema, paginationSchema, skillLevelSchema } from "./common.schema";

export const createOpponentRequestSchema = z.object({
  matchId: z.string().uuid().optional().nullable(),
  sportId: z.string().uuid(),
  title: z.string().min(3).max(200),
  format: z.string().min(1).max(50),
  skillLevel: skillLevelSchema,
  city: z.string().min(1).max(100),
  area: z.string().max(100).optional().nullable(),
  scheduledStartsAt: z.string().datetime().optional().nullable(),
  scheduledEndsAt: z.string().datetime().optional().nullable(),
  expiresAt: z.string().datetime().optional().nullable(),
});

export const updateOpponentRequestSchema = z.object({
  status: z.enum(["OPEN", "MATCHED", "CLOSED", "EXPIRED"]).optional(),
  title: z.string().min(3).max(200).optional(),
  format: z.string().min(1).max(50).optional(),
});

export const listOpponentRequestsSchema = paginationSchema.extend({
  sportId: z.string().uuid().optional(),
  city: z.string().max(100).optional(),
  status: z.enum(["OPEN", "MATCHED", "CLOSED", "EXPIRED"]).optional(),
});

export const reviewOpponentInterestSchema = z.object({
  action: interestActionSchema,
});

export const pairOpponentRequestSchema = z.object({
  opponentRequestId: z.string().uuid(),
  matchId: z.string().uuid().optional().nullable(),
});

export type CreateOpponentRequestBody = z.infer<typeof createOpponentRequestSchema>;
export type UpdateOpponentRequestBody = z.infer<typeof updateOpponentRequestSchema>;
export type PairOpponentRequestBody = z.infer<typeof pairOpponentRequestSchema>;
