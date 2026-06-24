import { z } from "zod";

import {
  dayOfWeekSchema,
  paginationSchema,
  profileVisibilitySchema,
  skillLevelSchema,
} from "./common.schema";

export const bootstrapBodySchema = z.object({
  displayName: z.string().min(2).max(100).optional(),
  city: z.string().min(1).max(100).optional(),
  timezone: z.string().max(50).optional(),
});

export const updateProfileSchema = z.object({
  displayName: z.string().min(2).max(100).optional(),
  bio: z.string().max(500).optional().nullable(),
  avatarUrl: z.string().url().max(500).optional().nullable(),
  city: z.string().min(1).max(100).optional(),
  area: z.string().max(100).optional().nullable(),
  latitude: z.number().min(-90).max(90).optional().nullable(),
  longitude: z.number().min(-180).max(180).optional().nullable(),
  profileVisibility: profileVisibilitySchema.optional(),
  timezone: z.string().max(50).optional(),
  emailNotificationsEnabled: z.boolean().optional(),
  pushNotificationsEnabled: z.boolean().optional(),
});

export const userSportInputSchema = z.object({
  sportId: z.string().uuid(),
  skillLevel: skillLevelSchema,
  isPrimary: z.boolean().optional(),
});

export const replaceUserSportsSchema = z.object({
  sports: z.array(userSportInputSchema).min(1).max(10),
});

export const availabilityWindowSchema = z.object({
  dayOfWeek: dayOfWeekSchema,
  startTime: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/),
  endTime: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/),
});

export const replaceAvailabilitySchema = z.object({
  windows: z.array(availabilityWindowSchema).max(21),
});

export const playerSearchSchema = paginationSchema.extend({
  sportId: z.string().uuid().optional(),
  skillLevel: skillLevelSchema.optional(),
  city: z.string().max(100).optional(),
  area: z.string().max(100).optional(),
  q: z.string().max(100).optional(),
});

export type BootstrapBody = z.infer<typeof bootstrapBodySchema>;
export type UpdateProfileBody = z.infer<typeof updateProfileSchema>;
export type ReplaceUserSportsBody = z.infer<typeof replaceUserSportsSchema>;
export type ReplaceAvailabilityBody = z.infer<typeof replaceAvailabilitySchema>;
export type PlayerSearchQuery = z.infer<typeof playerSearchSchema>;
