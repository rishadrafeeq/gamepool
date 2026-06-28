"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

import { ErrorState } from "@/components/ui/error-state";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);
  return (
    <html lang="en">
      <body className="min-h-screen font-sans">
        <main className="mx-auto flex min-h-screen max-w-lg items-center justify-center">
          <ErrorState
            title="Application error"
            message={
              error.digest
                ? `An unexpected error occurred. Reference: ${error.digest}`
                : "An unexpected error occurred. Please try again."
            }
            onRetry={reset}
          />
        </main>
      </body>
    </html>
  );
}
