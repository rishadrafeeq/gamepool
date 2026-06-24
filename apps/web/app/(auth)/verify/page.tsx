"use client";

import { useRouter } from "next/navigation";
import { sendEmailVerification } from "firebase/auth";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { getFirebaseAuth } from "@/lib/firebase/client";
import { isFirebaseClientConfigured } from "@/lib/env.client";

export default function VerifyPage() {
  const router = useRouter();

  async function resend() {
    if (!isFirebaseClientConfigured()) return;
    const user = getFirebaseAuth().currentUser;
    if (!user) {
      toast.error("Sign in first");
      router.push("/sign-in");
      return;
    }
    await sendEmailVerification(user);
    toast.success("Verification email sent");
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center gap-6 px-4 py-12">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold">Verify your email</h1>
        <p className="text-sm text-muted-foreground">
          Check your inbox for a verification link. You can continue onboarding while verified.
        </p>
      </div>
      <Button className="min-h-[44px]" onClick={() => router.push("/onboarding/sports")}>
        Continue to onboarding
      </Button>
      <Button variant="outline" className="min-h-[44px]" onClick={resend}>
        Resend verification email
      </Button>
    </main>
  );
}
