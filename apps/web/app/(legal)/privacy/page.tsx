import Link from "next/link";

import { Button } from "@/components/ui/button";

export default function PrivacyPolicyPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-12 prose prose-sm dark:prose-invert">
      <h1>Privacy Policy</h1>
      <p className="text-muted-foreground">Last updated: June 23, 2026</p>
      <p>
        GamePool (&quot;we&quot;, &quot;us&quot;) operates a sports coordination platform. This policy describes how we
        collect, use, and protect your information when you use GamePool.
      </p>
      <h2>Information we collect</h2>
      <ul>
        <li>Account identifiers (email, phone number via Firebase Authentication)</li>
        <li>Profile information you provide (display name, city, sports, skill levels)</li>
        <li>Match and coordination activity (hosted/joined matches, connections, reports)</li>
        <li>Technical data (device, logs, IP address for security and rate limiting)</li>
      </ul>
      <h2>How we use information</h2>
      <ul>
        <li>Provide player discovery, match coordination, and notifications</li>
        <li>Maintain safety (blocks, reports, moderation)</li>
        <li>Improve reliability and prevent abuse</li>
      </ul>
      <h2>What we do not do</h2>
      <ul>
        <li>We do not sell your personal information</li>
        <li>We do not expose your phone number or email to other users</li>
        <li>We do not provide personal messaging between users in MVP</li>
      </ul>
      <h2>Data retention &amp; security</h2>
      <p>
        Data is stored in secure cloud infrastructure. You may request account deletion through support. We use
        industry-standard encryption in transit (HTTPS) and access controls for admin operations.
      </p>
      <h2>Contact</h2>
      <p>For privacy requests, contact: privacy@gamepool.local</p>
      <Button asChild variant="outline" className="mt-6">
        <Link href="/welcome">Back</Link>
      </Button>
    </main>
  );
}
