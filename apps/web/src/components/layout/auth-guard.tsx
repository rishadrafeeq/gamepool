"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

import { useAuthListener } from "@/hooks/use-auth-listener";
import { useMe } from "@/features/users/hooks/use-me";
import { isProfileComplete } from "@/lib/auth-actions";
import { useAuthStore } from "@/stores/auth-store";
import { isFirebaseClientConfigured } from "@/lib/env.client";
import { Skeleton } from "@/components/ui/skeleton";

const PUBLIC_PREFIXES = ["/welcome", "/sign-in", "/sign-up", "/verify"];
const ONBOARDING_PREFIX = "/onboarding";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  useAuthListener();
  const router = useRouter();
  const pathname = usePathname();
  const { firebaseUid, isInitialized } = useAuthStore();
  const { data: user, isLoading } = useMe(Boolean(firebaseUid));

  useEffect(() => {
    if (!isInitialized) return;

    if (!isFirebaseClientConfigured()) return;

    const isPublic = PUBLIC_PREFIXES.some((p) => pathname.startsWith(p));
    const isOnboarding = pathname.startsWith(ONBOARDING_PREFIX);

    if (!firebaseUid && !isPublic) {
      router.replace("/welcome");
      return;
    }

    if (firebaseUid && user && !isProfileComplete(user) && !isOnboarding && !isPublic) {
      router.replace("/onboarding/sports");
      return;
    }

    if (firebaseUid && user && isProfileComplete(user) && isOnboarding) {
      router.replace("/home");
    }
  }, [firebaseUid, isInitialized, pathname, router, user]);

  if (!isInitialized || (firebaseUid && isLoading)) {
    return (
      <div className="space-y-4 p-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  return <>{children}</>;
}
