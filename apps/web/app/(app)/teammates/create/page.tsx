"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { createTeammateRequestSchema } from "@gamepool/shared";
import { z } from "zod";
import { toast } from "sonner";

import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SkillLevelSelect } from "@/components/domain/skill-level-select";
import { useSports } from "@/features/sports/hooks/use-sports";
import { useCreateTeammateRequest } from "@/features/coordination/hooks/use-coordination";
import type { SkillLevel } from "@/types";

const schema = createTeammateRequestSchema;
type FormValues = z.infer<typeof schema>;

export default function CreateTeammatePage() {
  const router = useRouter();
  const { data: sports } = useSports();
  const create = useCreateTeammateRequest();
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: "",
      sportId: "",
      requiredPlayers: 2,
      skillLevel: "INTERMEDIATE",
      city: "",
      description: "",
    },
  });

  async function onSubmit(values: FormValues) {
    try {
      await create.mutateAsync(values);
      toast.success("Request posted");
      router.push("/teammates");
    } catch {
      toast.error("Failed to post request");
    }
  }

  return (
    <>
      <PageHeader title="Post teammate request" backHref="/teammates" />
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 p-4">
        <div className="space-y-2">
          <Label>Title</Label>
          <Input {...form.register("title")} />
        </div>
        <div className="space-y-2">
          <Label>Sport</Label>
          <select className="flex h-10 w-full rounded-md border px-3 text-sm" {...form.register("sportId")}>
            <option value="">Select sport</option>
            {sports?.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label>Skill level</Label>
          <SkillLevelSelect
            value={form.watch("skillLevel") as SkillLevel}
            onChange={(v) => form.setValue("skillLevel", v)}
          />
        </div>
        <div className="space-y-2">
          <Label>Players needed</Label>
          <Input type="number" {...form.register("requiredPlayers", { valueAsNumber: true })} />
        </div>
        <div className="space-y-2">
          <Label>City</Label>
          <Input {...form.register("city")} />
        </div>
        <div className="space-y-2">
          <Label>Description</Label>
          <Textarea {...form.register("description")} />
        </div>
        <Button type="submit" className="w-full min-h-[44px]" disabled={create.isPending}>
          Post request
        </Button>
      </form>
    </>
  );
}
