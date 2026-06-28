import { ApiClientError } from "@/lib/api-client";

export function getAuthErrorMessage(err: unknown, fallback: string): string {
  if (err instanceof ApiClientError) {
    if (err.code === "DATABASE_UNAVAILABLE") {
      return "Database not connected. Set a cloud DATABASE_URL on Vercel (not localhost) and run migrations.";
    }
    if (err.code === "UNAUTHORIZED" || err.code === "AUTH_NOT_CONFIGURED") {
      return "Server auth failed. Check FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY on Vercel.";
    }
    return err.message;
  }

  return err instanceof Error ? err.message : fallback;
}
