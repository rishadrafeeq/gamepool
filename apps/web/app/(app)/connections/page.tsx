"use client";

import Link from "next/link";
import { toast } from "sonner";

import { PageHeader } from "@/components/layout/page-header";
import { ConnectionRequestCard } from "@/components/domain/connection-request-card";
import { EmptyState } from "@/components/domain/empty-state";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useConnections, useRespondConnection } from "@/features/connections/hooks/use-connections";
import { useMe } from "@/features/users/hooks/use-me";

export default function ConnectionsPage() {
  const { data: me } = useMe();
  const { data: pending } = useConnections("PENDING");
  const { data: accepted } = useConnections("ACCEPTED");
  const respond = useRespondConnection();

  return (
    <>
      <PageHeader title="Connections" backHref="/profile" />
      <div className="p-4">
        <Tabs defaultValue="pending">
          <TabsList className="w-full">
            <TabsTrigger value="pending">Pending</TabsTrigger>
            <TabsTrigger value="accepted">Connected</TabsTrigger>
          </TabsList>
          <TabsContent value="pending" className="mt-4 space-y-3">
            {pending?.length === 0 && <EmptyState title="No pending requests" />}
            {pending?.map((c) => (
              <ConnectionRequestCard
                key={c.id}
                connection={c}
                currentUserId={me?.id ?? ""}
                isPending={respond.isPending}
                onRespond={async (action) => {
                  try {
                    await respond.mutateAsync({ id: c.id, action });
                    toast.success(action === "ACCEPT" ? "Connected" : "Declined");
                  } catch {
                    toast.error("Action failed");
                  }
                }}
              />
            ))}
          </TabsContent>
          <TabsContent value="accepted" className="mt-4 space-y-3">
            {accepted?.length === 0 && <EmptyState title="No connections yet" />}
            {accepted?.map((c) => {
              const other =
                c.requesterUserId === me?.id ? c.recipient : c.requester;
              const name = other?.profile?.displayName ?? "Player";
              return (
                <Link key={c.id} href={`/players/${other?.id}`}>
                  <Card>
                    <CardContent className="p-4 font-medium">{name}</CardContent>
                  </Card>
                </Link>
              );
            })}
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}
