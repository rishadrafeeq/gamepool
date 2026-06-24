import { SignJWT, jwtVerify } from "jose";

import { getServerEnv } from "@/lib/env.server";
import { ApiError } from "@/server/errors/api-error";

export type AdminTokenPayload = {
  sub: string;
  role: string;
  email: string;
};

function getSecret() {
  const secret = getServerEnv().ADMIN_JWT_SECRET;
  if (!secret) {
    throw new ApiError(503, "ADMIN_AUTH_NOT_CONFIGURED", "Admin auth is not configured");
  }
  return new TextEncoder().encode(secret);
}

export async function signAdminToken(payload: AdminTokenPayload): Promise<string> {
  return new SignJWT({ role: payload.role, email: payload.email })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime("8h")
    .sign(getSecret());
}

export async function verifyAdminToken(token: string): Promise<AdminTokenPayload> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    if (!payload.sub || typeof payload.role !== "string") {
      throw new Error("Invalid payload");
    }
    return {
      sub: payload.sub,
      role: payload.role,
      email: String(payload.email ?? ""),
    };
  } catch {
    throw new ApiError(401, "UNAUTHORIZED", "Invalid or expired admin token");
  }
}
