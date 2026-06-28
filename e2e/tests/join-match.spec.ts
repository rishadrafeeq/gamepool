import { test, expect } from "@playwright/test";

import { ensureSignedIn } from "../helpers/auth";
import {
  approveJoinRequest,
  createAndPublishMatch,
  requestToJoinMatch,
} from "../helpers/match";
import { e2eEnv, hasHostCredentials, hasJoinerCredentials } from "../helpers/env";

test.describe("Join match", () => {
  test.beforeEach(() => {
    test.skip(
      !hasHostCredentials() || !hasJoinerCredentials(),
      "E2E_HOST_* and E2E_JOINER_* credentials required",
    );
  });

  test("joiner requests to join and host approves", async ({ browser }) => {
    const hostContext = await browser.newContext();
    const joinerContext = await browser.newContext();
    const hostPage = await hostContext.newPage();
    const joinerPage = await joinerContext.newPage();

    await ensureSignedIn(hostPage, e2eEnv.hostEmail, e2eEnv.hostPassword);
    const title = `E2E Join ${Date.now()}`;
    const matchId = await createAndPublishMatch(hostPage, title);

    await ensureSignedIn(joinerPage, e2eEnv.joinerEmail, e2eEnv.joinerPassword);
    await requestToJoinMatch(joinerPage, matchId);

    await approveJoinRequest(hostPage, matchId);
    await hostPage.goto(`/matches/${matchId}/manage`);
    await expect(hostPage.getByText("No pending requests")).toBeVisible();

    await hostContext.close();
    await joinerContext.close();
  });
});
