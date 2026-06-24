"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type PageHeaderProps = {
  title: string;
  backHref?: string;
  action?: React.ReactNode;
  className?: string;
};

export function PageHeader({ title, backHref, action, className }: PageHeaderProps) {
  return (
    <header className={cn("sticky top-0 z-40 flex items-center gap-2 border-b bg-background/95 px-4 py-3 backdrop-blur", className)}>
      {backHref ? (
        <Button variant="ghost" size="icon" asChild className="shrink-0">
          <Link href={backHref} aria-label="Go back">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
      ) : (
        <div className="w-10" />
      )}
      <h1 className="flex-1 truncate text-lg font-semibold">{title}</h1>
      <div className="flex min-w-10 justify-end">{action}</div>
    </header>
  );
}
