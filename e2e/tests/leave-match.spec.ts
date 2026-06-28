import { test, expect } from "@playwright/test";

import { ensureSignedIn } from "../helpers/auth";
import {
  approveJoinRequest,
  createAndPublishMatch,
  leaveMatch,
  requestToJoinMatch,
} from "../helpers/match";
import { e2eEnv, hasHostCredentials, hasJoinerCredentials } from "../helpers/env";

test.describe("Leave match", () => {
  test.beforeEach(() => {
    test.skip(
      !hasHostCredentials() || !hasJoinerCredentials(),
      "E2E_HOST_* and E2E_JOINER_* credentials required",
    );
  });

  test("confirmed participant can leave match", async ({ browser }) => {
    const hostContext = await browser.newContext();
    const joinerContext = await browser.newContext();
    const hostPage = await hostContext.newPage();
    const joinerPage = await joinerContext.newPage();

    await ensureSignedIn(hostPage, e2eEnv.hostEmail, e2eEnv.hostPassword);
    const matchId = await createAndPublishMatch(hostPage, `E2E Leave ${Date.now()}`);

    await ensureSignedIn(joinerPage, e2eEnv.joinerEmail, e2eEnv.joinerPassword);
    await requestToJoinMatch(joinerPage, matchId);
    await approveJoinRequest(hostPage, matchId);

    await leaveMatch(joinerPage, matchId);
    await expect(joinerPage).toHaveURL(/\/my-games/);

    await hostContext.close();
    await joinerContext.close();
  });
});
