import type { NextRequest } from "next/server";
import { ZodSchema, z } from "zod";

import { ApiError } from "@/server/errors/api-error";

export async function parseBody<T extends ZodSchema>(
  request: NextRequest,
  schema: T,
): Promise<z.output<T>> {
  const raw = await request.json().catch(() => ({}));
  return schema.parse(raw);
}

export function parseQuery<T extends ZodSchema>(
  request: NextRequest,
  schema: T,
): z.output<T> {
  const params = Object.fromEntries(request.nextUrl.searchParams.entries());
  return schema.parse(params);
}

export function requireParam(value: string | undefined, name: string): string {
  if (!value) {
    throw new ApiError(400, "MISSING_PARAM", `${name} is required`);
  }
  return value;
}
