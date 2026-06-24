import { z } from "zod";

import { matchStatusSchema, paginationSchema } from "./common.schema";

export const adminLoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
});

export const adminSuspendUserSchema = z.object({
  reason: z.string().max(500).optional().nullable(),
});

export const adminUpdateMatchSchema = z.object({
  status: matchStatusSchema.optional(),
  hiddenFromDiscovery: z.boolean().optional(),
});

export const adminListUsersSchema = paginationSchema.extend({
  q: z.string().max(100).optional(),
  status: z.enum(["ACTIVE", "SUSPENDED", "DEACTIVATED", "PENDING_VERIFICATION"]).optional(),
});

export const adminListMatchesSchema = paginationSchema.extend({
  sportId: z.string().uuid().optional(),
  status: matchStatusSchema.optional(),
  hostUserId: z.string().uuid().optional(),
});

export type AdminLoginBody = z.infer<typeof adminLoginSchema>;
