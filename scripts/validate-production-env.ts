#!/usr/bin/env tsx
/**
 * Validates required environment variables before production deploy.
 * Usage: pnpm validate:env
 */
import { z } from "zod";

const productionEnvSchema = z.object({
  NODE_ENV: z.literal("production"),
  DATABASE_URL: z.string().min(1),
  DIRECT_URL: z.string().min(1),
  NEXT_PUBLIC_APP_URL: z.string().url(),
  NEXT_PUBLIC_FIREBASE_API_KEY: z.string().min(1),
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: z.string().min(1),
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: z.string().min(1),
  NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: z.string().min(1),
  NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: z.string().min(1),
  NEXT_PUBLIC_FIREBASE_APP_ID: z.string().min(1),
  FIREBASE_PROJECT_ID: z.string().min(1),
  FIREBASE_CLIENT_EMAIL: z.string().email(),
  FIREBASE_PRIVATE_KEY: z.string().min(1),
  ADMIN_JWT_SECRET: z.string().min(32),
  SENTRY_DSN: z.string().url().optional(),
  NEXT_PUBLIC_SENTRY_DSN: z.string().url().optional(),
  UPSTASH_REDIS_REST_URL: z.string().url().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().min(1).optional(),
});

const warnings: string[] = [];
const errors: string[] = [];

function checkSecret(name: string, value: string | undefined, minLength = 1) {
  if (!value || value.length < minLength) {
    errors.push(`${name} is missing or too short`);
    return;
  }
  const placeholders = ["changeme", "change-me", "your-", "example", "test"];
  if (placeholders.some((p) => value.toLowerCase().includes(p))) {
    warnings.push(`${name} appears to use a placeholder value`);
  }
}

function main() {
  const env = process.env;

  checkSecret("DATABASE_URL", env.DATABASE_URL);
  checkSecret("ADMIN_JWT_SECRET", env.ADMIN_JWT_SECRET, 32);
  checkSecret("FIREBASE_PRIVATE_KEY", env.FIREBASE_PRIVATE_KEY);

  if (env.NODE_ENV !== "production") {
    warnings.push(
      `NODE_ENV is "${env.NODE_ENV ?? "unset"}" — strict schema applies to production only`,
    );
  }

  if (env.NODE_ENV === "production") {
    const result = productionEnvSchema.safeParse(env);
    if (!result.success) {
      for (const issue of result.error.issues) {
        errors.push(`${issue.path.join(".")}: ${issue.message}`);
      }
    }

    if (!env.SENTRY_DSN && !env.NEXT_PUBLIC_SENTRY_DSN) {
      warnings.push("SENTRY_DSN not set — error monitoring disabled in production");
    }

    const hasUpstashUrl = Boolean(env.UPSTASH_REDIS_REST_URL);
    const hasUpstashToken = Boolean(env.UPSTASH_REDIS_REST_TOKEN);
    if (hasUpstashUrl !== hasUpstashToken) {
      errors.push("UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN must both be set");
    }
    if (!hasUpstashUrl) {
      warnings.push(
        "Upstash Redis not configured — rate limiting falls back to per-instance memory",
      );
    }

    if (env.ADMIN_ALLOW_SEED === "true") {
      warnings.push("ADMIN_ALLOW_SEED=true in production — avoid unless intentionally re-seeding");
    }

    if (env.NEXT_PUBLIC_APP_URL && !env.NEXT_PUBLIC_APP_URL.startsWith("https://")) {
      warnings.push("NEXT_PUBLIC_APP_URL should use HTTPS in production");
    }
  }

  if (!env.SEED_ADMIN_PASSWORD) {
    warnings.push("SEED_ADMIN_PASSWORD not set (only needed for dev seeding)");
  } else if (env.SEED_ADMIN_PASSWORD === "changeme" && env.NODE_ENV === "production") {
    errors.push("SEED_ADMIN_PASSWORD must not use default value in production");
  }

  console.log("GamePool production environment validation\n");

  if (warnings.length) {
    console.log("Warnings:");
    for (const w of warnings) console.log(`  ⚠ ${w}`);
    console.log();
  }

  if (errors.length) {
    console.log("Errors:");
    for (const e of errors) console.log(`  ✗ ${e}`);
    console.log("\nValidation FAILED");
    process.exit(1);
  }

  console.log("Validation PASSED");
}

main();
