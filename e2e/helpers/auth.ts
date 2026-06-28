import type { Page } from "@playwright/test";

export async function signInWithEmail(page: Page, email: string, password: string) {
  await page.goto("/sign-in");
  await page.getByRole("tab", { name: "Email" }).click();
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in with email" }).click();
  await page.waitForURL(/\/(home|onboarding)/, { timeout: 30_000 });
}

export async function signUpWithEmail(
  page: Page,
  displayName: string,
  email: string,
  password: string,
) {
  await page.goto("/sign-up");
  await page.getByRole("tab", { name: "Email" }).click();
  await page.getByLabel("Display name").fill(displayName);
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Create account with email" }).click();
  await page.waitForURL(/\/verify/, { timeout: 30_000 });
}

export async function signUpWithPhone(
  page: Page,
  displayName: string,
  phone: string,
  otp: string,
) {
  await page.goto("/sign-up");
  await page.getByRole("tab", { name: "Phone" }).click();
  await page.getByLabel("Display name").fill(displayName);
  await page.getByRole("checkbox").check();
  await page.getByLabel("Phone number").fill(phone);
  await page.getByRole("button", { name: "Send OTP" }).click();
  await page.getByLabel("Verification code").fill(otp);
  await page.getByRole("button", { name: "Verify & continue" }).click();
  await page.waitForURL(/\/(home|onboarding)/, { timeout: 60_000 });
}

export async function completeOnboardingIfNeeded(page: Page) {
  if (page.url().includes("/onboarding/sports")) {
    await page.getByRole("button", { name: /Football|Cricket|Badminton/ }).first().click();
    await page.getByRole("button", { name: "Continue" }).click();
    await page.waitForURL(/\/onboarding\/location/);
  }

  if (page.url().includes("/onboarding/location")) {
    const city = page.getByLabel("City");
    if (await city.isVisible()) {
      const current = await city.inputValue();
      if (!current) await city.fill("Mumbai");
    }
    await page.getByRole("button", { name: "Continue" }).click();
    await page.waitForURL(/\/onboarding\/availability/);
  }

  if (page.url().includes("/onboarding/availability")) {
    await page.getByRole("button", { name: "Skip for now" }).click();
    await page.waitForURL(/\/home/);
  }
}

export async function ensureSignedIn(page: Page, email: string, password: string) {
  await signInWithEmail(page, email, password);
  await completeOnboardingIfNeeded(page);
  await page.waitForURL(/\/home/, { timeout: 30_000 });
}
