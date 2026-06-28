"use client";

import { ErrorState } from "@/components/ui/error-state";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="mx-auto flex min-h-screen max-w-lg items-center justify-center">
      <ErrorState
        message={
          error.digest
            ? `Please try again. Reference: ${error.digest}`
            : "Please try again."
        }
        onRetry={reset}
      />
    </main>
  );
}
