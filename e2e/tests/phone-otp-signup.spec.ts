import { test, expect } from "@playwright/test";

import { signUpWithPhone } from "../helpers/auth";
import { e2eEnv, hasPhoneTestConfig } from "../helpers/env";

test.describe("Phone OTP signup", () => {
  test.beforeEach(() => {
    test.skip(!hasPhoneTestConfig(), "E2E_TEST_PHONE and Firebase env required");
  });

  test("signs up with Firebase test phone number", async ({ page }) => {
    const displayName = `Phone E2E ${Date.now()}`;
    await signUpWithPhone(page, displayName, e2eEnv.testPhone, e2eEnv.testOtp);
    await expect(page).toHaveURL(/\/(home|onboarding)/);
  });
});
