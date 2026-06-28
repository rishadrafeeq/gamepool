"use client";

import { format } from "date-fns";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { PageHeader } from "@/components/layout/page-header";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { SportBadge } from "@/components/domain/sport-badge";
import { useMe } from "@/features/users/hooks/use-me";
import { signOutUser } from "@/lib/auth-actions";
import { useAuthStore } from "@/stores/auth-store";

export default function ProfilePage() {
  const { data: user } = useMe();
  const router = useRouter();
  const reset = useAuthStore((s) => s.reset);
  const name = user?.profile?.displayName ?? "Player";

  async function logout() {
    await signOutUser();
    reset();
    router.push("/welcome");
    toast.success("Signed out");
  }

  return (
    <>
      <PageHeader
        title="Profile"
        action={
          <Button size="sm" variant="outline" asChild>
            <Link href="/settings">Settings</Link>
          </Button>
        }
      />
      <div className="space-y-4 p-4">
        <Card>
          <CardContent className="flex items-center gap-4 p-4">
            <Avatar className="h-16 w-16">
              <AvatarImage src={user?.profile?.avatarUrl ?? undefined} />
              <AvatarFallback>{name.slice(0, 2).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div>
              <p className="text-lg font-semibold">{name}</p>
              <p className="text-sm text-muted-foreground">
                {[user?.profile?.city, user?.profile?.area].filter(Boolean).join(", ")}
              </p>
              {user?.stats?.memberSince && (
                <p className="text-xs text-muted-foreground">
                  Member since {format(new Date(user.stats.memberSince), "MMM yyyy")}
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {user?.stats && (
          <div className="grid grid-cols-2 gap-3">
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold">{user.stats.matchesJoined}</p>
                <p className="text-xs text-muted-foreground">Matches joined</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold">{user.stats.matchesHosted}</p>
                <p className="text-xs text-muted-foreground">Matches hosted</p>
              </CardContent>
            </Card>
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          {user?.userSports?.map((us) => (
            <SportBadge key={us.id} sport={us.sport} skill={us.skillLevel} />
          ))}
        </div>
        <div className="grid gap-2">
          <Button variant="outline" asChild className="min-h-[44px]">
            <Link href="/profile/edit">Edit profile</Link>
          </Button>
          <Button variant="outline" asChild className="min-h-[44px]">
            <Link href="/profile/sports">Sports</Link>
          </Button>
          <Button variant="outline" asChild className="min-h-[44px]">
            <Link href="/profile/availability">Availability</Link>
          </Button>
          <Button variant="outline" asChild className="min-h-[44px]">
            <Link href="/connections">Connections</Link>
          </Button>
          <Button variant="destructive" className="min-h-[44px]" onClick={logout}>
            Sign out
          </Button>
        </div>
      </div>
    </>
  );
}
