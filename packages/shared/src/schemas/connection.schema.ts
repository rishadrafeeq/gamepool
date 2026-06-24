import { z } from "zod";

import { connectionActionSchema, paginationSchema } from "./common.schema";

export const createConnectionSchema = z.object({
  recipientUserId: z.string().uuid(),
});

export const updateConnectionSchema = z.object({
  action: connectionActionSchema,
});

export const listConnectionsSchema = paginationSchema.extend({
  status: z.enum(["PENDING", "ACCEPTED", "DECLINED"]).optional(),
});

export type CreateConnectionBody = z.infer<typeof createConnectionSchema>;
export type UpdateConnectionBody = z.infer<typeof updateConnectionSchema>;
