"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { createOpponentRequestSchema } from "@gamepool/shared";
import { z } from "zod";
import { toast } from "sonner";

import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SkillLevelSelect } from "@/components/domain/skill-level-select";
import { useSports } from "@/features/sports/hooks/use-sports";
import { useCreateOpponentRequest } from "@/features/coordination/hooks/use-coordination";
import type { SkillLevel } from "@/types";

const schema = createOpponentRequestSchema;
type FormValues = z.infer<typeof schema>;

export default function CreateOpponentPage() {
  const router = useRouter();
  const { data: sports } = useSports();
  const create = useCreateOpponentRequest();
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: "",
      sportId: "",
      format: "Friendly",
      skillLevel: "INTERMEDIATE",
      city: "",
    },
  });

  async function onSubmit(values: FormValues) {
    try {
      await create.mutateAsync(values);
      toast.success("Request posted");
      router.push("/opponents");
    } catch {
      toast.error("Failed to post request");
    }
  }

  return (
    <>
      <PageHeader title="Post opponent request" backHref="/opponents" />
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
          <Label>Format</Label>
          <Input {...form.register("format")} />
        </div>
        <div className="space-y-2">
          <Label>Skill level</Label>
          <SkillLevelSelect
            value={form.watch("skillLevel") as SkillLevel}
            onChange={(v) => form.setValue("skillLevel", v)}
          />
        </div>
        <div className="space-y-2">
          <Label>City</Label>
          <Input {...form.register("city")} />
        </div>
        <Button type="submit" className="w-full min-h-[44px]" disabled={create.isPending}>
          Post request
        </Button>
      </form>
    </>
  );
}
