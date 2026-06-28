import { withSentryConfig } from "@sentry/nextjs";
import type { NextConfig } from "next";

function assertProductionFirebaseEnv() {
  if (process.env.NODE_ENV !== "production") return;

  const required = [
    "NEXT_PUBLIC_FIREBASE_API_KEY",
    "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN",
    "NEXT_PUBLIC_FIREBASE_PROJECT_ID",
    "NEXT_PUBLIC_FIREBASE_APP_ID",
  ] as const;

  const missing = required.filter((key) => !process.env[key]?.trim());
  if (missing.length > 0) {
    throw new Error(
      `Missing Firebase client env for production build: ${missing.join(", ")}. ` +
        "Add them in Vercel → Project → Settings → Environment Variables, then redeploy.",
    );
  }
}

assertProductionFirebaseEnv();

const nextConfig: NextConfig = {
  transpilePackages: ["@gamepool/database", "@gamepool/shared"],
  experimental: {
    optimizePackageImports: [
      "lucide-react",
      "date-fns",
      "@radix-ui/react-dialog",
      "@radix-ui/react-select",
      "@radix-ui/react-tabs",
      "@radix-ui/react-avatar",
    ],
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "firebasestorage.googleapis.com",
      },
    ],
  },
  serverExternalPackages: ["firebase-admin"],
};

export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  silent: !process.env.CI,
  widenClientFileUpload: true,
  disableLogger: true,
  automaticVercelMonitors: true,
});
