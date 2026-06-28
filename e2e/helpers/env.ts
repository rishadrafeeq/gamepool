import { config as loadEnv } from "dotenv";
import { resolve } from "node:path";

loadEnv({ path: resolve(__dirname, "../.env") });

export const e2eEnv = {
  baseUrl: process.env.E2E_BASE_URL ?? "http://localhost:3000",
  hostEmail: process.env.E2E_HOST_EMAIL ?? "",
  hostPassword: process.env.E2E_HOST_PASSWORD ?? "",
  joinerEmail: process.env.E2E_JOINER_EMAIL ?? "",
  joinerPassword: process.env.E2E_JOINER_PASSWORD ?? "",
  adminEmail: process.env.E2E_ADMIN_EMAIL ?? process.env.SEED_ADMIN_EMAIL ?? "admin@gamepool.local",
  adminPassword: process.env.E2E_ADMIN_PASSWORD ?? process.env.SEED_ADMIN_PASSWORD ?? "changeme",
  testPhone: process.env.E2E_TEST_PHONE ?? "",
  testOtp: process.env.E2E_TEST_OTP ?? "123456",
  firebaseConfigured: Boolean(
    process.env.NEXT_PUBLIC_FIREBASE_API_KEY &&
      process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN &&
      process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID &&
      process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  ),
};

export function hasHostCredentials(): boolean {
  return Boolean(e2eEnv.hostEmail && e2eEnv.hostPassword && e2eEnv.firebaseConfigured);
}

export function hasJoinerCredentials(): boolean {
  return Boolean(e2eEnv.joinerEmail && e2eEnv.joinerPassword && e2eEnv.firebaseConfigured);
}

export function hasPhoneTestConfig(): boolean {
  return Boolean(e2eEnv.testPhone && e2eEnv.firebaseConfigured);
}

export function hasAdminCredentials(): boolean {
  return Boolean(e2eEnv.adminEmail && e2eEnv.adminPassword);
}
