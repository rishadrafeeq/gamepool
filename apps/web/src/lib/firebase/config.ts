import type { FirebaseClientConfig } from "@/lib/firebase/types";
import { getFirebaseRuntimeConfig } from "@/lib/firebase/runtime-config";

export function getFirebaseClientConfig(): FirebaseClientConfig {
  return getFirebaseRuntimeConfig();
}

/** @deprecated Use getFirebaseClientConfig() */
export const firebaseClientConfig = new Proxy({} as FirebaseClientConfig, {
  get(_target, prop: keyof FirebaseClientConfig) {
    return getFirebaseRuntimeConfig()[prop];
  },
});
