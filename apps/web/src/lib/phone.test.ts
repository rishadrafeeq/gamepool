import { describe, expect, it } from "vitest";

import { isValidE164Phone, maskPhoneNumber, normalizePhoneNumber } from "./phone";

describe("normalizePhoneNumber", () => {
  it("normalizes 10-digit India numbers", () => {
    expect(normalizePhoneNumber("9876543210")).toBe("+919876543210");
  });

  it("preserves E.164 input", () => {
    expect(normalizePhoneNumber("+14155552671")).toBe("+14155552671");
  });
});

describe("isValidE164Phone", () => {
  it("accepts valid numbers", () => {
    expect(isValidE164Phone("+919876543210")).toBe(true);
  });

  it("rejects invalid numbers", () => {
    expect(isValidE164Phone("98765")).toBe(false);
  });
});

describe("maskPhoneNumber", () => {
  it("masks middle digits", () => {
    expect(maskPhoneNumber("+919876543210")).toContain("****");
  });
});
