"use client";

import type { ApiErrorBody, ApiSuccessResponse } from "@gamepool/shared";

import { getAdminToken } from "@/stores/admin-auth-store";

export class AdminApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "AdminApiError";
  }
}

export async function adminFetch<T>(
  path: string,
  options: RequestInit = {},
): Promise<ApiSuccessResponse<T>> {
  const token = getAdminToken();
  const headers = new Headers(options.headers);
  headers.set("Content-Type", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const response = await fetch(path, { ...options, headers });
  const json = (await response.json()) as ApiSuccessResponse<T> | ApiErrorBody;

  if (!response.ok) {
    const err = json as ApiErrorBody;
    throw new AdminApiError(
      response.status,
      err.error?.code ?? "UNKNOWN_ERROR",
      err.error?.message ?? "Request failed",
    );
  }

  return json as ApiSuccessResponse<T>;
}
