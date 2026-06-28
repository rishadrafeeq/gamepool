"use client";

import { Toaster } from "sonner";

import { FirebaseConfigProvider } from "@/components/firebase-config-provider";
import { Providers } from "@/components/providers";
import type { FirebaseClientConfig } from "@/lib/firebase/types";

export function AppProviders({
  children,
  firebaseConfig,
}: {
  children: React.ReactNode;
  firebaseConfig: FirebaseClientConfig;
}) {
  return (
    <FirebaseConfigProvider config={firebaseConfig}>
      <Providers>
        {children}
        <Toaster position="top-center" richColors closeButton />
      </Providers>
    </FirebaseConfigProvider>
  );
}
