import { test, expect } from "@playwright/test";

import { ensureSignedIn } from "../helpers/auth";
import { createOpponentRequest, pairOpponentRequest } from "../helpers/coordination";
import { e2eEnv, hasHostCredentials, hasJoinerCredentials } from "../helpers/env";

test.describe("Opponent pairing", () => {
  test.beforeEach(() => {
    test.skip(
      !hasHostCredentials() || !hasJoinerCredentials(),
      "E2E_HOST_* and E2E_JOINER_* credentials required",
    );
  });

  test("host pairs with another open opponent request", async ({ browser }) => {
    const hostContext = await browser.newContext();
    const joinerContext = await browser.newContext();
    const hostPage = await hostContext.newPage();
    const joinerPage = await joinerContext.newPage();

    await ensureSignedIn(hostPage, e2eEnv.hostEmail, e2eEnv.hostPassword);
    const hostTitle = `E2E Opponent A ${Date.now()}`;
    const hostRequestId = await createOpponentRequest(hostPage, hostTitle);

    await ensureSignedIn(joinerPage, e2eEnv.joinerEmail, e2eEnv.joinerPassword);
    await createOpponentRequest(joinerPage, `E2E Opponent B ${Date.now()}`);

    await pairOpponentRequest(hostPage, hostRequestId);
    await hostPage.reload();
    await expect(hostPage.getByText("Matched")).toBeVisible();

    await hostContext.close();
    await joinerContext.close();
  });
});
