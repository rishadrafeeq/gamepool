import type { Page } from "@playwright/test";

export async function createTeammateRequest(page: Page, title: string): Promise<string> {
  await page.goto("/teammates/create");
  await page.getByLabel("Title").fill(title);
  await page.locator("select").first().selectOption({ index: 1 });
  await page.getByLabel("City").fill("Mumbai");
  await page.getByRole("button", { name: "Post request" }).click();
  await page.waitForURL(/\/teammates$/);

  await page.getByRole("link", { name: title }).click();
  await page.waitForURL(/\/teammates\/[0-9a-f-]+/i);
  return page.url().split("/").pop()!;
}

export async function expressTeammateInterest(page: Page, requestId: string) {
  await page.goto(`/teammates/${requestId}`);
  await page.getByRole("button", { name: /interested/i }).click();
}

export async function approveTeammateInterest(page: Page, requestId: string) {
  await page.goto(`/teammates/${requestId}`);
  await page.getByRole("button", { name: "Approve" }).first().click();
}

export async function createOpponentRequest(page: Page, title: string): Promise<string> {
  await page.goto("/opponents/create");
  await page.getByLabel("Title").fill(title);
  await page.locator("select").first().selectOption({ index: 1 });
  await page.getByLabel("City").fill("Mumbai");
  await page.getByRole("button", { name: "Post request" }).click();
  await page.waitForURL(/\/opponents$/);

  await page.getByRole("link", { name: title }).click();
  await page.waitForURL(/\/opponents\/[0-9a-f-]+/i);
  return page.url().split("/").pop()!;
}

export async function pairOpponentRequest(page: Page, requestId: string) {
  await page.goto(`/opponents/${requestId}`);
  await page.getByRole("button", { name: "Pair" }).first().click();
}
