import { test, expect } from "@playwright/test";

import { signUpWithEmail } from "../helpers/auth";
import { e2eEnv } from "../helpers/env";

test.describe("Email signup", () => {
  test.beforeEach(() => {
    test.skip(!e2eEnv.firebaseConfigured, "Firebase client env not configured");
  });

  test("creates account and redirects to email verification", async ({ page }) => {
    const unique = `e2e-${Date.now()}@gamepool-e2e.test`;
    await signUpWithEmail(page, "E2E User", unique, "TestPass123!");
    await expect(page).toHaveURL(/\/verify/);
    await expect(page.getByRole("heading")).toBeVisible();
  });
});
