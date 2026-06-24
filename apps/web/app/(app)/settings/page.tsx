"use client";

import Link from "next/link";

import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function SettingsPage() {
  return (
    <>
      <PageHeader title="Settings" backHref="/profile" />
      <div className="space-y-4 p-4">
        <Card>
          <CardContent className="space-y-3 p-4">
            <h3 className="font-semibold">Account</h3>
            <Button variant="outline" asChild className="w-full justify-start">
              <Link href="/profile/edit">Edit profile</Link>
            </Button>
            <Button variant="outline" asChild className="w-full justify-start">
              <Link href="/profile/sports">Sports & skills</Link>
            </Button>
            <Button variant="outline" asChild className="w-full justify-start">
              <Link href="/profile/availability">Availability</Link>
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="space-y-3 p-4">
            <h3 className="font-semibold">Privacy & safety</h3>
            <Button variant="outline" asChild className="w-full justify-start">
              <Link href="/connections">Sports connections</Link>
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="space-y-2 p-4 text-sm text-muted-foreground">
            <p>GamePool MVP — sports coordination platform</p>
            <p>Version 0.1.0</p>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
