import type { Metadata } from "next";

import { AuthGuard } from "@/components/layout/auth-guard";
import { MobileShell } from "@/components/layout/mobile-shell";

export const metadata: Metadata = {
  title: "GamePool",
};

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <MobileShell>{children}</MobileShell>
    </AuthGuard>
  );
}
