import { ZodError } from "zod";

import { error } from "@gamepool/shared";
import { NextResponse } from "next/server";

import { logError } from "@/server/logging/logger";

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export function jsonSuccess<T>(
  data: T,
  init?: ResponseInit,
  meta?: { page?: number; limit?: number; total?: number },
) {
  return NextResponse.json(
    {
      data,
      ...(meta ? { meta } : {}),
    },
    { status: 200, ...init },
  );
}

export function jsonCreated<T>(data: T) {
  return NextResponse.json({ data }, { status: 201 });
}

export function jsonNoContent() {
  return new NextResponse(null, { status: 204 });
}

export function jsonError(
  status: number,
  code: string,
  message: string,
  details?: unknown,
) {
  return NextResponse.json(error(code, message, details), { status });
}

export function handleApiError(err: unknown, context?: { requestId?: string; path?: string }) {
  if (err instanceof ApiError) {
    return jsonError(err.status, err.code, err.message, err.details);
  }

  if (err instanceof ZodError) {
    return jsonError(400, "VALIDATION_ERROR", "Invalid request", err.flatten());
  }

  logError({
    message: "unhandled_api_error",
    error: err,
    requestId: context?.requestId,
    path: context?.path,
  });
  return jsonError(500, "INTERNAL_ERROR", "An unexpected error occurred");
}
