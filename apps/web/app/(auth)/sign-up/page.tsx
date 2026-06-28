"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { toast } from "sonner";

import { AuthMethodTabs } from "@/components/auth/auth-method-tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { signUpWithEmail, isProfileComplete } from "@/lib/auth-actions";
import { getAuthErrorMessage } from "@/lib/auth-error-message";
import { isFirebaseClientConfigured } from "@/lib/env.client";
import { apiFetch } from "@/lib/api-client";
import type { User } from "@/types";

const PhoneAuthForm = dynamic(
  () =>
    import("@/components/auth/phone-auth-form").then((m) => ({
      default: m.PhoneAuthForm,
    })),
  {
    loading: () => <Skeleton className="h-32 w-full" />,
    ssr: false,
  },
);

const schema = z.object({
  displayName: z.string().min(2).max(100),
  email: z.string().email(),
  password: z.string().min(8).max(128),
  ageConfirmed: z.boolean().refine((v) => v === true, {
    message: "You must confirm you are at least 13 years old",
  }),
});

type FormValues = z.infer<typeof schema>;

export default function SignUpPage() {
  const router = useRouter();
  const [phoneDisplayName, setPhoneDisplayName] = useState("");
  const [phoneAgeConfirmed, setPhoneAgeConfirmed] = useState(false);
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { displayName: "", email: "", password: "", ageConfirmed: false },
  });

  async function afterAuth() {
    const res = await apiFetch<User>("/api/v1/users/me");
    router.push(isProfileComplete(res.data) ? "/home" : "/onboarding/sports");
  }

  async function onSubmit(values: FormValues) {
    if (!isFirebaseClientConfigured()) {
      toast.error("Firebase is not configured");
      return;
    }
    try {
      await signUpWithEmail(values.email, values.password, values.displayName);
      toast.success("Account created. Verify your email.");
      router.push("/verify");
    } catch (err) {
      toast.error(getAuthErrorMessage(err, "Sign up failed"));
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center gap-6 px-4 py-12">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold">Sign up</h1>
        <p className="text-sm text-muted-foreground">Create your GamePool account</p>
      </div>
      <AuthMethodTabs
        emailContent={
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="displayName">Display name</Label>
              <Input id="displayName" {...form.register("displayName")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" autoComplete="email" {...form.register("email")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" autoComplete="new-password" {...form.register("password")} />
            </div>
            <label className="flex items-start gap-2 text-sm">
              <input type="checkbox" className="mt-1" {...form.register("ageConfirmed")} />
              <span>
                I confirm I am at least 13 years old and agree to the{" "}
                <Link href="/terms" className="text-primary underline">
                  Terms
                </Link>{" "}
                and{" "}
                <Link href="/privacy" className="text-primary underline">
                  Privacy Policy
                </Link>
                .
              </span>
            </label>
            {form.formState.errors.ageConfirmed && (
              <p className="text-sm text-destructive">{form.formState.errors.ageConfirmed.message}</p>
            )}
            <Button type="submit" className="w-full min-h-[44px]" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? "Creating..." : "Create account with email"}
            </Button>
          </form>
        }
        phoneContent={
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="phoneDisplayName">Display name</Label>
              <Input
                id="phoneDisplayName"
                value={phoneDisplayName}
                onChange={(e) => setPhoneDisplayName(e.target.value)}
              />
            </div>
            <label className="flex items-start gap-2 text-sm">
              <input
                type="checkbox"
                className="mt-1"
                checked={phoneAgeConfirmed}
                onChange={(e) => setPhoneAgeConfirmed(e.target.checked)}
              />
              <span>
                I confirm I am at least 13 years old and agree to the{" "}
                <Link href="/terms" className="text-primary underline">
                  Terms
                </Link>{" "}
                and{" "}
                <Link href="/privacy" className="text-primary underline">
                  Privacy Policy
                </Link>
                .
              </span>
            </label>
            <PhoneAuthForm
              mode="sign-up"
              displayName={phoneDisplayName}
              onBeforeBootstrap={() => {
                if (!phoneDisplayName.trim()) return "Enter a display name";
                if (!phoneAgeConfirmed) return "Confirm age and terms to continue";
                return null;
              }}
              onSuccess={afterAuth}
            />
          </div>
        }
      />
      <p className="text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link href="/sign-in" className="text-primary underline-offset-4 hover:underline">
          Sign in
        </Link>
      </p>
    </main>
  );
}
