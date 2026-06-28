"use client";

import type { FirebaseClientConfig } from "@/lib/firebase/types";
import { setFirebaseRuntimeConfig } from "@/lib/firebase/runtime-config";

export function FirebaseConfigProvider({
  config,
  children,
}: {
  config: FirebaseClientConfig;
  children: React.ReactNode;
}) {
  setFirebaseRuntimeConfig(config);
  return children;
}
