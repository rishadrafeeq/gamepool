import Link from "next/link";

import { Button } from "@/components/ui/button";

export default function TermsPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-12 prose prose-sm dark:prose-invert">
      <h1>Terms &amp; Conditions</h1>
      <p className="text-muted-foreground">Last updated: June 23, 2026</p>
      <p>
        By using GamePool you agree to these Terms. GamePool is a sports coordination platform — not a social network.
        Users coordinate through matches, invites, connections, and system notifications only.
      </p>
      <h2>Eligibility</h2>
      <p>You must be at least 13 years old (or the minimum age in your jurisdiction) to use GamePool.</p>
      <h2>Acceptable use</h2>
      <ul>
        <li>Provide accurate profile and match information</li>
        <li>Respect other players; no harassment, spam, or no-shows</li>
        <li>Do not attempt to harvest contact information from other users</li>
        <li>Do not circumvent blocks, visibility rules, or moderation</li>
      </ul>
      <h2>Matches &amp; participation</h2>
      <p>
        Hosts and participants are responsible for showing up and following venue rules. GamePool facilitates discovery
        and coordination but does not guarantee match outcomes or venue availability.
      </p>
      <h2>Account suspension</h2>
      <p>We may suspend accounts that violate these Terms or receive valid abuse reports.</p>
      <h2>Limitation of liability</h2>
      <p>
        GamePool is provided &quot;as is&quot;. To the extent permitted by law, we are not liable for injuries, disputes,
        or losses arising from games organized through the platform.
      </p>
      <h2>Contact</h2>
      <p>Questions: legal@gamepool.local</p>
      <Button asChild variant="outline" className="mt-6">
        <Link href="/welcome">Back</Link>
      </Button>
    </main>
  );
}
