import { test, expect } from "@playwright/test";

import { e2eEnv, hasAdminCredentials } from "../helpers/env";

test.describe("Admin login", () => {
  test.beforeEach(() => {
    test.skip(!hasAdminCredentials(), "E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD required");
  });

  test("admin signs in and reaches dashboard", async ({ page }) => {
    await page.goto("/admin/login");
    await page.getByLabel("Email").fill(e2eEnv.adminEmail);
    await page.getByLabel("Password").fill(e2eEnv.adminPassword);
    await page.getByRole("button", { name: "Sign in" }).click();
    await page.waitForURL(/\/admin$/, { timeout: 30_000 });
    await expect(page.getByRole("heading", { name: /Dashboard|Admin/i })).toBeVisible();
  });
});
