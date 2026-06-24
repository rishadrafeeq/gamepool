"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { Button } from "@/components/ui/button";
import { useAuthListener } from "@/hooks/use-auth-listener";
import { useAuthStore } from "@/stores/auth-store";

export default function WelcomePage() {
  useAuthListener();
  const router = useRouter();
  const firebaseUid = useAuthStore((s) => s.firebaseUid);

  useEffect(() => {
    if (firebaseUid) router.replace("/home");
  }, [firebaseUid, router]);

  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center gap-8 px-4 py-12">
      <div className="space-y-3">
        <h1 className="text-3xl font-bold">Welcome to GamePool</h1>
        <p className="text-muted-foreground">
          Coordinate local sports — find players, fill matches, and play.
        </p>
      </div>
      <div className="flex flex-col gap-3">
        <Button asChild size="lg" className="min-h-[44px]">
          <Link href="/sign-up">Create account</Link>
        </Button>
        <Button asChild variant="outline" size="lg" className="min-h-[44px]">
          <Link href="/sign-in">Sign in</Link>
        </Button>
      </div>
    </main>
  );
}
