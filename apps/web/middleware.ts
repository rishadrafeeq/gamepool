import { NextResponse, type NextRequest } from "next/server";

import {
  applyContentSecurityPolicy,
  buildContentSecurityPolicy,
} from "@/server/security/csp";
import {
  AUTH_RATE_LIMIT,
  DEFAULT_API_RATE_LIMIT,
  checkRateLimitDistributed,
  getClientIp,
} from "@/server/security/rate-limit-distributed";

function applySecurityHeaders(response: NextResponse) {
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("X-DNS-Prefetch-Control", "off");
  response.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=()",
  );
  applyContentSecurityPolicy(response, {
    sentryDsn: process.env.NEXT_PUBLIC_SENTRY_DSN ?? process.env.SENTRY_DSN,
  });
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/api/v1/")) {
    const isHealth = pathname.startsWith("/api/v1/health");
    if (!isHealth) {
      const ip = getClientIp(request.headers);
      const isAuthRoute =
        pathname.includes("/auth/") || pathname.includes("/admin/auth/");
      const limit = isAuthRoute ? AUTH_RATE_LIMIT : DEFAULT_API_RATE_LIMIT;
      const key = `${ip}:${isAuthRoute ? "auth" : "api"}`;
      const result = await checkRateLimitDistributed(
        key,
        limit,
        isAuthRoute ? "auth" : "api",
      );

      if (!result.allowed) {
        return NextResponse.json(
          {
            error: {
              code: "RATE_LIMITED",
              message: "Too many requests. Please try again later.",
            },
          },
          {
            status: 429,
            headers: {
              "Retry-After": String(result.retryAfterSec ?? 60),
              "X-RateLimit-Remaining": "0",
              "Content-Security-Policy": buildContentSecurityPolicy({
                sentryDsn:
                  process.env.NEXT_PUBLIC_SENTRY_DSN ?? process.env.SENTRY_DSN,
              }),
            },
          },
        );
      }
    }
  }

  const response = NextResponse.next();
  applySecurityHeaders(response);

  if (pathname.startsWith("/api/")) {
    response.headers.set("Cache-Control", "no-store");
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
