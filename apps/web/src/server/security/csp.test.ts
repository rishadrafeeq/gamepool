import { describe, expect, it } from "vitest";

import { buildContentSecurityPolicy } from "./csp";

describe("buildContentSecurityPolicy", () => {
  it("includes Firebase and Google domains", () => {
    const csp = buildContentSecurityPolicy();
    expect(csp).toContain("https://www.gstatic.com");
    expect(csp).toContain("https://identitytoolkit.googleapis.com");
    expect(csp).toContain("https://securetoken.googleapis.com");
    expect(csp).toContain("frame-ancestors 'none'");
  });

  it("includes Sentry ingest host when DSN provided", () => {
    const csp = buildContentSecurityPolicy({
      sentryDsn: "https://abc@o123.ingest.sentry.io/456",
    });
    expect(csp).toContain("https://o123.ingest.sentry.io");
  });

  it("sets upgrade-insecure-requests in production", () => {
    const prev = process.env.NODE_ENV;
    process.env.NODE_ENV = "production";
    const csp = buildContentSecurityPolicy();
    expect(csp).toContain("upgrade-insecure-requests");
    process.env.NODE_ENV = prev;
  });
});
