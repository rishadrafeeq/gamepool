"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createReportSchema } from "@gamepool/shared";
import { z } from "zod";
import { toast } from "sonner";

import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useCreateReport } from "@/features/safety/hooks/use-safety";

const schema = createReportSchema;
type FormValues = z.infer<typeof schema>;

type Props = { params: Promise<{ id: string }> };

export default function ReportUserPage({ params }: Props) {
  const { id } = use(params);
  const router = useRouter();
  const createReport = useCreateReport();
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      reportedUserId: id,
      reason: "OTHER",
      description: "",
    },
  });

  async function onSubmit(values: FormValues) {
    try {
      await createReport.mutateAsync(values);
      toast.success("Report submitted");
      router.back();
    } catch {
      toast.error("Could not submit report");
    }
  }

  return (
    <>
      <PageHeader title="Report user" backHref={`/players/${id}`} />
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 p-4">
        <div className="space-y-2">
          <Label>Reason</Label>
          <select className="flex h-10 w-full rounded-md border px-3 text-sm" {...form.register("reason")}>
            <option value="HARASSMENT">Harassment</option>
            <option value="NO_SHOW">No show</option>
            <option value="FAKE_PROFILE">Fake profile</option>
            <option value="SPAM">Spam</option>
            <option value="INAPPROPRIATE_CONTENT">Inappropriate content</option>
            <option value="OTHER">Other</option>
          </select>
        </div>
        <div className="space-y-2">
          <Label>Details</Label>
          <Textarea {...form.register("description")} />
        </div>
        <Button type="submit" className="w-full min-h-[44px]" disabled={createReport.isPending}>
          Submit report
        </Button>
      </form>
    </>
  );
}
