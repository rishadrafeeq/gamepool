import type { NextRequest } from "next/server";

import { logRequest } from "./logger";

export function getRequestId(request: NextRequest): string {
  return (
    request.headers.get("x-request-id") ??
    request.headers.get("x-correlation-id") ??
    crypto.randomUUID()
  );
}

export async function withRequestLogging<T extends Response>(
  request: NextRequest,
  handler: (requestId: string) => Promise<T>,
): Promise<T> {
  const requestId = getRequestId(request);
  const started = Date.now();

  try {
    const response = await handler(requestId);
    logRequest({
      method: request.method,
      path: request.nextUrl.pathname,
      status: response.status,
      durationMs: Date.now() - started,
      requestId,
    });
    response.headers.set("x-request-id", requestId);
    return response;
  } catch (error) {
    logRequest({
      method: request.method,
      path: request.nextUrl.pathname,
      status: 500,
      durationMs: Date.now() - started,
      requestId,
    });
    throw error;
  }
}
