import { z } from "zod";

export const createBlockSchema = z.object({
  blockedUserId: z.string().uuid(),
});

export type CreateBlockBody = z.infer<typeof createBlockSchema>;
