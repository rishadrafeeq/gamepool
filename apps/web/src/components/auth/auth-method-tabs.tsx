"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type AuthMethodTabsProps = {
  emailContent: React.ReactNode;
  phoneContent: React.ReactNode;
  defaultTab?: "email" | "phone";
};

export function AuthMethodTabs({ emailContent, phoneContent, defaultTab = "email" }: AuthMethodTabsProps) {
  return (
    <Tabs defaultValue={defaultTab} className="w-full">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="email">Email</TabsTrigger>
        <TabsTrigger value="phone">Phone</TabsTrigger>
      </TabsList>
      <TabsContent value="email" className="mt-4">
        {emailContent}
      </TabsContent>
      <TabsContent value="phone" className="mt-4">
        {phoneContent}
      </TabsContent>
    </Tabs>
  );
}
