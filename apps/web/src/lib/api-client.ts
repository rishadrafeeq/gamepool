"use client";

import type { ApiErrorBody, ApiSuccessResponse } from "@gamepool/shared";

import { getIdToken } from "@/lib/firebase/client";
import { isFirebaseClientConfigured } from "@/lib/env.client";

export class ApiClientError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = "ApiClientError";
  }
}

type RequestOptions = RequestInit & {
  auth?: boolean;
};

export async function apiFetch<T>(
  path: string,
  options: RequestOptions = {},
): Promise<ApiSuccessResponse<T>> {
  const { auth = true, headers, ...rest } = options;

  const requestHeaders = new Headers(headers);
  requestHeaders.set("Content-Type", "application/json");

  if (auth && isFirebaseClientConfigured()) {
    const token = await getIdToken();
    if (token) {
      requestHeaders.set("Authorization", `Bearer ${token}`);
    }
  }

  const response = await fetch(path, {
    ...rest,
    headers: requestHeaders,
  });

  const json = (await response.json()) as ApiSuccessResponse<T> | ApiErrorBody;

  if (!response.ok) {
    const err = json as ApiErrorBody;
    throw new ApiClientError(
      response.status,
      err.error?.code ?? "UNKNOWN_ERROR",
      err.error?.message ?? "Request failed",
      err.error?.details,
    );
  }

  return json as ApiSuccessResponse<T>;
}
