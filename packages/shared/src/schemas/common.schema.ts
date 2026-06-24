import { z } from "zod";

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type PaginationQuery = z.output<typeof paginationSchema>;

export const skillLevelSchema = z.enum([
  "BEGINNER",
  "INTERMEDIATE",
  "ADVANCED",
  "PROFESSIONAL",
]);

export const dayOfWeekSchema = z.enum([
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY",
  "SUNDAY",
]);

export const profileVisibilitySchema = z.enum(["PUBLIC", "CONNECTIONS_ONLY"]);

export const reportReasonSchema = z.enum([
  "HARASSMENT",
  "NO_SHOW",
  "FAKE_PROFILE",
  "SPAM",
  "INAPPROPRIATE_CONTENT",
  "OTHER",
]);

export const matchVisibilitySchema = z.enum([
  "PUBLIC",
  "CONNECTIONS_ONLY",
  "INVITE_ONLY",
]);

export const matchStatusSchema = z.enum([
  "DRAFT",
  "OPEN",
  "FULL",
  "IN_PROGRESS",
  "COMPLETED",
  "CANCELLED",
]);

export const connectionActionSchema = z.enum(["ACCEPT", "DECLINE"]);

export const joinRequestActionSchema = z.enum(["APPROVE", "DECLINE"]);

export const interestActionSchema = z.enum(["APPROVE", "DECLINE"]);
