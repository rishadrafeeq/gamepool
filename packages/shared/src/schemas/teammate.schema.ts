import { z } from "zod";

import { paginationSchema, skillLevelSchema } from "./common.schema";
import { interestActionSchema } from "./common.schema";

export const createTeammateRequestSchema = z.object({
  matchId: z.string().uuid().optional().nullable(),
  sportId: z.string().uuid(),
  title: z.string().min(3).max(200),
  description: z.string().max(2000).optional().nullable(),
  requiredPlayers: z.number().int().min(1).max(50),
  skillLevel: skillLevelSchema,
  city: z.string().min(1).max(100),
  area: z.string().max(100).optional().nullable(),
  expiresAt: z.string().datetime().optional().nullable(),
});

export const updateTeammateRequestSchema = z.object({
  status: z.enum(["OPEN", "CLOSED", "EXPIRED"]).optional(),
  title: z.string().min(3).max(200).optional(),
  description: z.string().max(2000).optional().nullable(),
  requiredPlayers: z.number().int().min(1).max(50).optional(),
});

export const listTeammateRequestsSchema = paginationSchema.extend({
  sportId: z.string().uuid().optional(),
  city: z.string().max(100).optional(),
  status: z.enum(["OPEN", "CLOSED", "EXPIRED"]).optional(),
});

export const reviewTeammateInterestSchema = z.object({
  action: interestActionSchema,
});

export type CreateTeammateRequestBody = z.infer<typeof createTeammateRequestSchema>;
export type UpdateTeammateRequestBody = z.infer<typeof updateTeammateRequestSchema>;
