import { z } from "zod";

import { paginationSchema, reportReasonSchema } from "./common.schema";

export const createReportSchema = z
  .object({
    reportedUserId: z.string().uuid().optional().nullable(),
    reportedMatchId: z.string().uuid().optional().nullable(),
    reason: reportReasonSchema,
    description: z.string().max(2000).optional().nullable(),
  })
  .refine((d) => d.reportedUserId || d.reportedMatchId, {
    message: "reportedUserId or reportedMatchId is required",
  });

export const adminReviewReportSchema = z.object({
  status: z.enum(["UNDER_REVIEW", "RESOLVED", "DISMISSED"]),
  resolutionNotes: z.string().max(2000).optional().nullable(),
});

export const listReportsSchema = paginationSchema.extend({
  status: z.enum(["OPEN", "UNDER_REVIEW", "RESOLVED", "DISMISSED"]).optional(),
});

export type CreateReportBody = z.infer<typeof createReportSchema>;
