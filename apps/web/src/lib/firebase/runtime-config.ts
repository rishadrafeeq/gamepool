import type { FirebaseClientConfig } from "@/lib/firebase/types";

let runtimeConfig: FirebaseClientConfig | null = null;

function buildTimeConfigFromEnv(): FirebaseClientConfig {
  return {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? "",
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ?? "",
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? "",
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ?? "",
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? "",
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID ?? "",
  };
}

export function setFirebaseRuntimeConfig(config: FirebaseClientConfig) {
  runtimeConfig = config;
}

export function getFirebaseRuntimeConfig(): FirebaseClientConfig {
  return runtimeConfig ?? buildTimeConfigFromEnv();
}

export function isFirebaseClientConfigured(
  config: FirebaseClientConfig = getFirebaseRuntimeConfig(),
): boolean {
  return Boolean(
    config.apiKey && config.authDomain && config.projectId && config.appId,
  );
}
