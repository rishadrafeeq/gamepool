import type { DecodedIdToken } from "firebase-admin/auth";
import { headers } from "next/headers";

import { isFirebaseAdminConfigured } from "@/lib/env.server";
import { verifyFirebaseIdToken } from "@/lib/firebase/admin";
import { ApiError } from "@/server/errors/api-error";

export type AuthenticatedRequestUser = {
  firebaseUid: string;
  email?: string;
  phone?: string;
  decoded: DecodedIdToken;
};

export async function getBearerToken(): Promise<string | null> {
  const headerStore = await headers();
  const authorization = headerStore.get("authorization");

  if (!authorization?.startsWith("Bearer ")) {
    return null;
  }

  return authorization.slice(7).trim();
}

export async function requireFirebaseUser(): Promise<AuthenticatedRequestUser> {
  const token = await getBearerToken();

  if (!token) {
    throw new ApiError(401, "UNAUTHORIZED", "Missing or invalid Authorization header");
  }

  if (!isFirebaseAdminConfigured()) {
    throw new ApiError(
      503,
      "AUTH_NOT_CONFIGURED",
      "Firebase Admin is not configured on the server",
    );
  }

  try {
    const decoded = await verifyFirebaseIdToken(token);
    return {
      firebaseUid: decoded.uid,
      email: decoded.email,
      phone: decoded.phone_number,
      decoded,
    };
  } catch {
    throw new ApiError(401, "UNAUTHORIZED", "Invalid or expired Firebase ID token");
  }
}
