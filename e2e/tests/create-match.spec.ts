import { test, expect } from "@playwright/test";

import { ensureSignedIn } from "../helpers/auth";
import { createAndPublishMatch } from "../helpers/match";
import { e2eEnv, hasHostCredentials } from "../helpers/env";

test.describe("Create match", () => {
  test.beforeEach(() => {
    test.skip(!hasHostCredentials(), "E2E_HOST_EMAIL / E2E_HOST_PASSWORD required");
  });

  test("host publishes a new match", async ({ page }) => {
    await ensureSignedIn(page, e2eEnv.hostEmail, e2eEnv.hostPassword);
    const title = `E2E Match ${Date.now()}`;
    const matchId = await createAndPublishMatch(page, title);
    await expect(page.getByRole("heading", { name: "Match" })).toBeVisible();
    await expect(page.getByText(title)).toBeVisible();
    expect(matchId).toMatch(/^[0-9a-f-]{36}$/i);
  });
});
