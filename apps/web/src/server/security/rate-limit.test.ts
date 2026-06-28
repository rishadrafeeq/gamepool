import { describe, expect, it, beforeEach } from "vitest";

import {
  AUTH_RATE_LIMIT,
  checkRateLimit,
  DEFAULT_API_RATE_LIMIT,
  resetRateLimitStore,
} from "./rate-limit";

describe("checkRateLimit", () => {
  beforeEach(() => {
    resetRateLimitStore();
  });

  it("allows requests under the limit", () => {
    const key = "ip:test";
    for (let i = 0; i < DEFAULT_API_RATE_LIMIT.maxRequests; i++) {
      const result = checkRateLimit(key, DEFAULT_API_RATE_LIMIT);
      expect(result.allowed).toBe(true);
    }
  });

  it("blocks requests over the limit", () => {
    const key = "ip:blocked";
    for (let i = 0; i < AUTH_RATE_LIMIT.maxRequests; i++) {
      checkRateLimit(key, AUTH_RATE_LIMIT);
    }
    const blocked = checkRateLimit(key, AUTH_RATE_LIMIT);
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterSec).toBeGreaterThan(0);
  });

  it("resets after window expires", () => {
    const key = "ip:reset";
    const shortWindow = { windowMs: 1, maxRequests: 1 };
    checkRateLimit(key, shortWindow);
    const blocked = checkRateLimit(key, shortWindow);
    expect(blocked.allowed).toBe(false);

    return new Promise<void>((resolve) => {
      setTimeout(() => {
        const allowed = checkRateLimit(key, shortWindow);
        expect(allowed.allowed).toBe(true);
        resolve();
      }, 5);
    });
  });
});
