import { z } from "zod";

import { paginationSchema } from "./common.schema";

export const listNotificationsSchema = paginationSchema;

export const markAllNotificationsReadSchema = z.object({});
