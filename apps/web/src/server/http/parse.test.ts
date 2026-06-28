import { describe, expect, it } from "vitest";

import { createNextRequest } from "@/test/helpers";
import { parseQuery, requireParam } from "./parse";
import { paginationSchema } from "@gamepool/shared";
import { ApiError } from "@/server/errors/api-error";

describe("parseQuery", () => {
  it("parses query string against schema", () => {
    const req = createNextRequest("/api/v1/matches", { page: "2", limit: "10" });
    expect(parseQuery(req, paginationSchema)).toEqual({ page: 2, limit: 10 });
  });
});

describe("requireParam", () => {
  it("returns value when present", () => {
    expect(requireParam("abc", "id")).toBe("abc");
  });

  it("throws ApiError when missing", () => {
    expect(() => requireParam(undefined, "id")).toThrow(ApiError);
    try {
      requireParam(undefined, "id");
    } catch (err) {
      expect(err).toBeInstanceOf(ApiError);
      expect((err as ApiError).code).toBe("MISSING_PARAM");
    }
  });
});
