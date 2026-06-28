"use client";

import { use, useEffect, useRef, useState } from "react";
import { format } from "date-fns";
import { toast } from "sonner";

import { PageHeader } from "@/components/layout/page-header";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useMatchChat, useSendMatchChatMessage } from "@/features/matches/hooks/use-match-chat";
import { useMe } from "@/features/users/hooks/use-me";

type Props = { params: Promise<{ id: string }> };

export default function MatchChatPage({ params }: Props) {
  const { id } = use(params);
  const { data: me } = useMe();
  const { data, isLoading, error } = useMatchChat(id);
  const send = useSendMatchChatMessage(id);
  const [text, setText] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [data?.messages.length]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const body = text.trim();
    if (!body) return;
    try {
      await send.mutateAsync(body);
      setText("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not send message");
    }
  }

  if (isLoading) return <Skeleton className="m-4 h-48" />;

  if (error) {
    return (
      <>
        <PageHeader title="Match chat" backHref={`/matches/${id}`} />
        <p className="p-4 text-sm text-muted-foreground">
          {error instanceof Error ? error.message : "Chat unavailable"}
        </p>
      </>
    );
  }

  const expired = data?.expiresAt && new Date(data.expiresAt) < new Date();

  return (
    <>
      <PageHeader title="Match chat" backHref={`/matches/${id}`} />
      <div className="flex min-h-[calc(100vh-8rem)] flex-col p-4">
        {data?.expiresAt && (
          <p className="mb-3 text-xs text-muted-foreground">
            Chat closes {format(new Date(data.expiresAt), "MMM d, h:mm a")} (7 days after match)
          </p>
        )}
        <div className="flex-1 space-y-3 overflow-y-auto pb-4">
          {data?.messages.length === 0 && (
            <p className="text-center text-sm text-muted-foreground">
              No messages yet. Say hi to your squad.
            </p>
          )}
          {data?.messages.map((msg) => {
            const mine = msg.user.id === me?.id;
            const name = msg.user.displayName;
            return (
              <div key={msg.id} className={`flex gap-2 ${mine ? "flex-row-reverse" : ""}`}>
                <Avatar className="h-8 w-8">
                  <AvatarImage src={msg.user.avatarUrl ?? undefined} />
                  <AvatarFallback>{name.slice(0, 2).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div
                  className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${
                    mine ? "bg-primary text-primary-foreground" : "bg-muted"
                  }`}
                >
                  {!mine && <p className="mb-1 text-xs font-medium opacity-80">{name}</p>}
                  <p>{msg.body}</p>
                  <p className="mt-1 text-[10px] opacity-70">
                    {format(new Date(msg.createdAt), "h:mm a")}
                  </p>
                </div>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>
        <form onSubmit={submit} className="flex gap-2 border-t pt-3">
          <Input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={expired ? "Chat closed" : "Message the team..."}
            disabled={expired || send.isPending}
            maxLength={2000}
          />
          <Button type="submit" disabled={expired || send.isPending || !text.trim()}>
            Send
          </Button>
        </form>
      </div>
    </>
  );
}
