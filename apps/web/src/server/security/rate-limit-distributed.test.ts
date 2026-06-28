import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  checkRateLimitDistributed,
  getRateLimitBackend,
  resetDistributedRateLimiters,
} from "./rate-limit-distributed";
import { AUTH_RATE_LIMIT } from "./rate-limit";

describe("checkRateLimitDistributed", () => {
  beforeEach(() => {
    resetDistributedRateLimiters();
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
  });

  it("falls back to in-memory when Upstash is not configured", async () => {
    expect(getRateLimitBackend()).toBe("memory");
    const key = "test:memory";
    for (let i = 0; i < AUTH_RATE_LIMIT.maxRequests; i++) {
      const result = await checkRateLimitDistributed(key, AUTH_RATE_LIMIT, "auth");
      expect(result.allowed).toBe(true);
    }
    const blocked = await checkRateLimitDistributed(key, AUTH_RATE_LIMIT, "auth");
    expect(blocked.allowed).toBe(false);
  });

  it("reports upstash backend when env is set", () => {
    process.env.UPSTASH_REDIS_REST_URL = "https://example.upstash.io";
    process.env.UPSTASH_REDIS_REST_TOKEN = "token";
    vi.resetModules();
    // getRateLimitBackend reads env at call time
    expect(getRateLimitBackend()).toBe("upstash");
  });
});
