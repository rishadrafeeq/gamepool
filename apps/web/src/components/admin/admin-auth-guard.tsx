"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

import { useAdminAuthStore } from "@/stores/admin-auth-store";

export function AdminAuthGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const session = useAdminAuthStore((s) => s.session);

  useEffect(() => {
    if (pathname === "/admin/login") return;
    if (!session?.token) {
      router.replace("/admin/login");
    }
  }, [pathname, router, session]);

  if (pathname === "/admin/login") return <>{children}</>;
  if (!session?.token) return null;

  return <>{children}</>;
}
