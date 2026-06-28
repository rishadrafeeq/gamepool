"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { updateProfileSchema } from "@gamepool/shared";
import { z } from "zod";
import { toast } from "sonner";

import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useMe } from "@/features/users/hooks/use-me";
import { useUpdateProfile } from "@/features/users/hooks/use-users";

const schema = updateProfileSchema;
type FormValues = z.infer<typeof schema>;

export default function EditProfilePage() {
  const router = useRouter();
  const { data: user } = useMe();
  const updateProfile = useUpdateProfile();
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    values: {
      displayName: user?.profile?.displayName ?? "",
      bio: user?.profile?.bio ?? "",
      city: user?.profile?.city ?? "",
      area: user?.profile?.area ?? "",
      avatarUrl: user?.profile?.avatarUrl ?? "",
      profileVisibility: user?.profile?.profileVisibility ?? "PUBLIC",
    },
  });

  async function onSubmit(values: FormValues) {
    try {
      await updateProfile.mutateAsync(values);
      toast.success("Profile updated");
      router.push("/profile");
    } catch {
      toast.error("Update failed");
    }
  }

  return (
    <>
      <PageHeader title="Edit profile" backHref="/profile" />
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 p-4">
        <div className="space-y-2">
          <Label>Display name</Label>
          <Input {...form.register("displayName")} />
        </div>
        <div className="space-y-2">
          <Label>Bio</Label>
          <Textarea {...form.register("bio")} />
        </div>
        <div className="space-y-2">
          <Label>Avatar URL</Label>
          <Input {...form.register("avatarUrl")} />
        </div>
        <div className="space-y-2">
          <Label>City</Label>
          <Input {...form.register("city")} />
        </div>
        <div className="space-y-2">
          <Label>Area</Label>
          <Input {...form.register("area")} />
        </div>
        <div className="space-y-2">
          <Label>Profile visibility</Label>
          <Select
            value={form.watch("profileVisibility") ?? "PUBLIC"}
            onValueChange={(v) => form.setValue("profileVisibility", v as "PUBLIC" | "CONNECTIONS_ONLY")}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="PUBLIC">Public</SelectItem>
              <SelectItem value="CONNECTIONS_ONLY">Connections only</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Connections only hides your full profile from non-connections.
          </p>
        </div>
        <Button type="submit" className="w-full min-h-[44px]" disabled={updateProfile.isPending}>
          Save
        </Button>
      </form>
    </>
  );
}
