import { describe, expect, it } from "vitest";

import { paginationSchema, reportReasonSchema } from "./common.schema";

describe("paginationSchema", () => {
  it("applies defaults", () => {
    expect(paginationSchema.parse({})).toEqual({ page: 1, limit: 20 });
  });

  it("coerces string query params", () => {
    expect(paginationSchema.parse({ page: "2", limit: "50" })).toEqual({
      page: 2,
      limit: 50,
    });
  });

  it("rejects limit above 100", () => {
    expect(() => paginationSchema.parse({ limit: 101 })).toThrow();
  });

  it("rejects page below 1", () => {
    expect(() => paginationSchema.parse({ page: 0 })).toThrow();
  });
});

describe("reportReasonSchema", () => {
  it("accepts valid reasons", () => {
    expect(reportReasonSchema.parse("HARASSMENT")).toBe("HARASSMENT");
  });

  it("rejects unknown reasons", () => {
    expect(() => reportReasonSchema.parse("INVALID")).toThrow();
  });
});
