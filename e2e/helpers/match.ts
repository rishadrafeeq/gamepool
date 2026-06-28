import type { Page } from "@playwright/test";

function futureDatetimeLocal(hoursFromNow = 48): string {
  const d = new Date(Date.now() + hoursFromNow * 60 * 60 * 1000);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export async function createAndPublishMatch(page: Page, title: string): Promise<string> {
  await page.goto("/matches/create");

  await page.locator("select").first().selectOption({ index: 1 });
  await page.getByLabel("Title").fill(title);
  await page.getByLabel("Format").fill("5-a-side");
  await page.getByRole("button", { name: "Next" }).click();
  await page.waitForURL(/\/matches\/create\/schedule/);

  await page.getByLabel("Starts at").fill(futureDatetimeLocal(72));
  await page.getByLabel("Venue name").fill("E2E Sports Ground");
  await page.getByLabel("City", { exact: true }).fill("Mumbai");
  await page.getByRole("button", { name: "Next" }).click();
  await page.waitForURL(/\/matches\/create\/details/);

  const approvalCheckbox = page.getByRole("checkbox", { name: /Require host approval/i });
  if (await approvalCheckbox.isChecked()) {
    await approvalCheckbox.uncheck();
  }

  await page.getByRole("button", { name: "Publish match" }).click();
  await page.waitForURL(/\/matches\/[0-9a-f-]+$/i, { timeout: 30_000 });

  const matchId = page.url().split("/").pop()!;
  return matchId;
}

export async function requestToJoinMatch(page: Page, matchId: string) {
  await page.goto(`/matches/${matchId}`);
  await page.getByRole("link", { name: "Request to join" }).click();
  await page.getByRole("button", { name: "Send request" }).click();
  await page.waitForURL(new RegExp(`/matches/${matchId}$`));
}

export async function approveJoinRequest(page: Page, matchId: string) {
  await page.goto(`/matches/${matchId}/manage`);
  await page.getByRole("button", { name: "Approve" }).first().click();
}

export async function leaveMatch(page: Page, matchId: string) {
  await page.goto(`/matches/${matchId}`);
  await page.getByRole("button", { name: "Leave match" }).click();
  await page.getByRole("button", { name: "Leave match" }).last().click();
  await page.waitForURL(/\/my-games/);
}
