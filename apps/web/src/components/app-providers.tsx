"use client";

import { Toaster } from "sonner";

import { Providers } from "@/components/providers";

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <Providers>
      {children}
      <Toaster position="top-center" richColors closeButton />
    </Providers>
  );
}
