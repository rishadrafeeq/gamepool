import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis/cloudflare";

import {
  AUTH_RATE_LIMIT,
  DEFAULT_API_RATE_LIMIT,
  type RateLimitConfig,
  type RateLimitResult,
  checkRateLimit,
  resetRateLimitStore,
} from "./rate-limit";

export {
  AUTH_RATE_LIMIT,
  DEFAULT_API_RATE_LIMIT,
  getClientIp,
} from "./rate-limit";

export type RateLimitBackend = "upstash" | "memory";

let authLimiter: Ratelimit | null | undefined;
let apiLimiter: Ratelimit | null | undefined;

function isUpstashConfigured(): boolean {
  return Boolean(
    process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN,
  );
}

function getRedis(): Redis {
  return new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL!,
    token: process.env.UPSTASH_REDIS_REST_TOKEN!,
  });
}

function getUpstashLimiter(config: RateLimitConfig, prefix: string): Ratelimit {
  const windowSec = Math.max(1, Math.ceil(config.windowMs / 1000));
  return new Ratelimit({
    redis: getRedis(),
    limiter: Ratelimit.slidingWindow(config.maxRequests, `${windowSec} s`),
    prefix: `gamepool:rl:${prefix}`,
    analytics: true,
  });
}

function getAuthLimiter(): Ratelimit {
  if (!authLimiter) {
    authLimiter = getUpstashLimiter(AUTH_RATE_LIMIT, "auth");
  }
  return authLimiter;
}

function getApiLimiter(): Ratelimit {
  if (!apiLimiter) {
    apiLimiter = getUpstashLimiter(DEFAULT_API_RATE_LIMIT, "api");
  }
  return apiLimiter;
}

export function getRateLimitBackend(): RateLimitBackend {
  return isUpstashConfigured() ? "upstash" : "memory";
}

export async function checkRateLimitDistributed(
  key: string,
  config: RateLimitConfig,
  bucket: "auth" | "api",
): Promise<RateLimitResult> {
  if (!isUpstashConfigured()) {
    return checkRateLimit(key, config);
  }

  const limiter = bucket === "auth" ? getAuthLimiter() : getApiLimiter();
  const result = await limiter.limit(key);

  if (result.success) {
    return {
      allowed: true,
      remaining: result.remaining,
    };
  }

  const retryAfterSec = Math.max(
    1,
    Math.ceil((result.reset - Date.now()) / 1000),
  );

  return {
    allowed: false,
    remaining: 0,
    retryAfterSec,
  };
}

/** Clears in-memory buckets and cached Upstash limiter instances (tests). */
export function resetDistributedRateLimiters(): void {
  resetRateLimitStore();
  authLimiter = undefined;
  apiLimiter = undefined;
}
