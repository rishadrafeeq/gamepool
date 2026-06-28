import { test, expect } from "@playwright/test";

import { ensureSignedIn } from "../helpers/auth";
import {
  approveTeammateInterest,
  createTeammateRequest,
  expressTeammateInterest,
} from "../helpers/coordination";
import { e2eEnv, hasHostCredentials, hasJoinerCredentials } from "../helpers/env";

test.describe("Teammate approval", () => {
  test.beforeEach(() => {
    test.skip(
      !hasHostCredentials() || !hasJoinerCredentials(),
      "E2E_HOST_* and E2E_JOINER_* credentials required",
    );
  });

  test("host approves teammate interest", async ({ browser }) => {
    const hostContext = await browser.newContext();
    const joinerContext = await browser.newContext();
    const hostPage = await hostContext.newPage();
    const joinerPage = await joinerContext.newPage();

    await ensureSignedIn(hostPage, e2eEnv.hostEmail, e2eEnv.hostPassword);
    const title = `E2E Teammate ${Date.now()}`;
    const requestId = await createTeammateRequest(hostPage, title);

    await ensureSignedIn(joinerPage, e2eEnv.joinerEmail, e2eEnv.joinerPassword);
    await expressTeammateInterest(joinerPage, requestId);

    await approveTeammateInterest(hostPage, requestId);
    await hostPage.reload();
    await expect(hostPage.getByText("Approved")).toBeVisible();

    await hostContext.close();
    await joinerContext.close();
  });
});
