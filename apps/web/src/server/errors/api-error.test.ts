import { describe, expect, it } from "vitest";
import { ZodError } from "zod";

import {
  ApiError,
  handleApiError,
  jsonError,
  jsonSuccess,
} from "./api-error";

describe("ApiError", () => {
  it("carries status, code, and message", () => {
    const err = new ApiError(404, "NOT_FOUND", "Missing resource");
    expect(err.status).toBe(404);
    expect(err.code).toBe("NOT_FOUND");
    expect(err.message).toBe("Missing resource");
  });
});

describe("jsonSuccess", () => {
  it("wraps data in envelope", async () => {
    const res = jsonSuccess({ id: "1" });
    const body = await res.json();
    expect(body).toEqual({ data: { id: "1" } });
    expect(res.status).toBe(200);
  });

  it("includes pagination meta when provided", async () => {
    const res = jsonSuccess([1, 2], undefined, { page: 1, limit: 20, total: 2 });
    const body = await res.json();
    expect(body.meta).toEqual({ page: 1, limit: 20, total: 2 });
  });
});

describe("jsonError", () => {
  it("returns standardized error envelope", async () => {
    const res = jsonError(400, "VALIDATION_ERROR", "Invalid input", { field: "email" });
    const body = await res.json();
    expect(res.status).toBe(400);
    expect(body.error.code).toBe("VALIDATION_ERROR");
    expect(body.error.message).toBe("Invalid input");
    expect(body.error.details).toEqual({ field: "email" });
  });
});

describe("handleApiError", () => {
  it("maps ApiError to response", async () => {
    const res = handleApiError(new ApiError(403, "FORBIDDEN", "Denied"));
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error.code).toBe("FORBIDDEN");
  });

  it("maps ZodError to validation response", async () => {
    const zodErr = new ZodError([
      {
        code: "invalid_type",
        expected: "string",
        received: "number",
        path: ["email"],
        message: "Expected string",
      },
    ]);
    const res = handleApiError(zodErr);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe("VALIDATION_ERROR");
  });

  it("maps unknown errors to internal error", async () => {
    const res = handleApiError(new Error("boom"));
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error.code).toBe("INTERNAL_ERROR");
  });
});
