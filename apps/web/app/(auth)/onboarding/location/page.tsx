"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { toast } from "sonner";

import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useUpdateProfile } from "@/features/users/hooks/use-users";
import { useMe } from "@/features/users/hooks/use-me";

const schema = z.object({
  displayName: z.string().min(2).max(100),
  city: z.string().min(1).max(100),
  area: z.string().max(100).optional(),
});

type FormValues = z.infer<typeof schema>;

export default function OnboardingLocationPage() {
  const router = useRouter();
  const { data: user } = useMe();
  const updateProfile = useUpdateProfile();
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    values: {
      displayName: user?.profile?.displayName ?? "",
      city: user?.profile?.city === "Unknown" ? "" : user?.profile?.city ?? "",
      area: user?.profile?.area ?? "",
    },
  });

  async function onSubmit(values: FormValues) {
    try {
      await updateProfile.mutateAsync(values);
      router.push("/onboarding/availability");
    } catch {
      toast.error("Failed to save profile");
    }
  }

  return (
    <>
      <PageHeader title="Your location" backHref="/onboarding/sports" />
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 p-4">
        <div className="space-y-2">
          <Label htmlFor="displayName">Display name</Label>
          <Input id="displayName" {...form.register("displayName")} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="city">City</Label>
          <Input id="city" {...form.register("city")} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="area">Area (optional)</Label>
          <Input id="area" {...form.register("area")} />
        </div>
        <Button type="submit" className="w-full min-h-[44px]" disabled={updateProfile.isPending}>
          Continue
        </Button>
      </form>
    </>
  );
}
