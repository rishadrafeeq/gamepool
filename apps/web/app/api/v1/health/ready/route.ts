import { NextResponse, type NextRequest } from "next/server";

import { prisma } from "@gamepool/database";
import { success } from "@gamepool/shared";

import { getServerEnv, isFirebaseAdminConfigured } from "@/lib/env.server";
import { withRequestLogging } from "@/server/logging/request-log";
import { logger } from "@/server/logging/logger";

type CheckStatus = "ok" | "degraded" | "error";

type ReadinessCheck = {
  name: string;
  status: CheckStatus;
  message?: string;
};

async function checkDatabase(): Promise<ReadinessCheck> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return { name: "database", status: "ok" };
  } catch (err) {
    logger.error("readiness_database_failed", { error: err });
    return {
      name: "database",
      status: "error",
      message: "Database connection failed",
    };
  }
}

function checkFirebase(): ReadinessCheck {
  if (!isFirebaseAdminConfigured()) {
    return {
      name: "firebase_admin",
      status: "degraded",
      message: "Firebase Admin credentials not configured",
    };
  }
  return { name: "firebase_admin", status: "ok" };
}

function checkAdminJwt(): ReadinessCheck {
  const env = getServerEnv();
  if (!env.ADMIN_JWT_SECRET || env.ADMIN_JWT_SECRET.length < 32) {
    return {
      name: "admin_jwt",
      status: "degraded",
      message: "ADMIN_JWT_SECRET missing or too short",
    };
  }
  return { name: "admin_jwt", status: "ok" };
}

export async function GET(request: NextRequest) {
  return withRequestLogging(request, async () => {
    const checks = await Promise.all([
      checkDatabase(),
      Promise.resolve(checkFirebase()),
      Promise.resolve(checkAdminJwt()),
    ]);

    const hasError = checks.some((c) => c.status === "error");
    const overall: CheckStatus = hasError
      ? "error"
      : checks.some((c) => c.status === "degraded")
        ? "degraded"
        : "ok";

    const payload = success({
      status: overall,
      service: "gamepool-api",
      version: "v1",
      timestamp: new Date().toISOString(),
      checks,
    });

    return NextResponse.json(payload, { status: hasError ? 503 : 200 });
  });
}
