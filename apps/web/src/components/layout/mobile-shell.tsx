import { BottomNav } from "@/components/layout/bottom-nav";

export function MobileShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto min-h-screen w-full max-w-lg bg-background">
      <div className="pb-20 pt-[env(safe-area-inset-top)]">{children}</div>
      <BottomNav />
    </div>
  );
}
