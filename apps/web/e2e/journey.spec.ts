import { expect, test, type Page } from "@playwright/test";

/** Full learner journey: sign up → onboarding → roadmap → tasks → quiz → results. */
test("core learning journey", async ({ page }) => {
  const email = `e2e-${Date.now()}@example.com`;

  await test.step("sign up", async () => {
    await page.goto("/signup");
    await page.getByLabel("Full name").fill("Ada Learner");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password", { exact: true }).fill("Focus2026!");
    await expect(page.getByText("Strong password")).toBeVisible();
    await page.getByRole("checkbox").check();
    await page.getByRole("button", { name: "Create account" }).click();
    await expect(page).toHaveURL(/\/onboarding/);
  });

  await test.step("onboarding generates a roadmap", async () => {
    await page.getByRole("button", { name: "Become an AI Engineer" }).click();
    await page.getByRole("button", { name: /Beginner/ }).click();
    await page.getByRole("button", { name: "1 h", exact: true }).click();
    await page.getByLabel("Target duration").selectOption("6");
    await page.getByRole("button", { name: "Generate my roadmap" }).click();
    await expect(page).toHaveURL(/\/roadmap$/, { timeout: 60_000 });
    await expect(page.getByRole("heading", { level: 1, name: "Become an AI Engineer" })).toBeVisible();
  });

  await test.step("roadmap shows statuses and sets today's focus", async () => {
    const modules = page.getByRole("region", { name: "Modules" });
    await expect(modules.getByRole("button", { name: /Variables and data types/ })).toContainText("Up next");
    await expect(modules.getByRole("button", { name: /Object-oriented programming/ })).toContainText("Locked");
    const detail = page.getByRole("complementary", { name: "Topic detail" });
    await expect(detail.getByRole("heading", { name: "Variables and data types" })).toBeVisible();
    await expect(detail.getByText("Done means")).toBeVisible();
    await expect(detail.getByText("None — start here")).toBeVisible();
    await detail.getByRole("button", { name: "Set as today's focus" }).click();
    await expect(page).toHaveURL(/\/today/);
  });

  await test.step("dashboard tasks: activity ticks by hand, evidence tasks don't", async () => {
    const focus = page.getByRole("region", { name: "Today's focus" });
    await expect(focus.getByRole("heading", { name: "Variables and data types" })).toBeVisible();
    await expect(focus).toContainText("0/4");
    const tasks = page.getByRole("region", { name: "Today's tasks" });
    await tasks.getByRole("checkbox").first().check();
    await expect(focus).toContainText("1/4");
    await expect(tasks.getByText("Activity")).toBeVisible();
    await expect(tasks.getByText("Practical")).toBeVisible();
    await expect(page.getByRole("region", { name: "Recommended next" }).getByText("Why this?")).toBeVisible();
    // Ticking an activity task earns no XP.
    await expect(page.getByText(/^0 XP$/)).toBeVisible();
  });

  await test.step("take the quiz", async () => {
    await page.getByRole("button", { name: /Take the Variables and data types quiz/ }).click();
    await expect(page).toHaveURL(/\/quiz\//, { timeout: 30_000 });
    const questions = page.locator("fieldset");
    const n = await questions.count();
    expect(n).toBeGreaterThanOrEqual(5);
    for (let i = 0; i < n; i++) {
      // Fake mode: option 1 is correct. Get one wrong on purpose.
      await questions.nth(i).getByRole("radio").nth(i === 1 ? 1 : 0).check();
    }
    await page.getByRole("button", { name: "Submit answers" }).click();
    await expect(page).toHaveURL(/\/results\//, { timeout: 30_000 });
  });

  await test.step("results: mastery vs pass line, formula, evidence, next step, revisions", async () => {
    await expect(page.getByRole("heading", { name: /Variables and data types — results/ })).toBeVisible();
    await expect(page.getByText("How well you know each part")).toBeVisible();
    await page.getByRole("button", { name: "How is this calculated?" }).click();
    await expect(page.getByText(/quiz answers \(40%\)/)).toBeVisible();
    await expect(page.getByText(/not a grade/).first()).toBeVisible();
    const evidence = page.getByRole("region", { name: "Evidence" });
    await expect(evidence).toContainText("9 / 10");
    // Quiz alone can't pass a concept: 0.4 × 90% = 36%.
    await expect(page.getByText("Not proven yet")).toBeVisible();
    await expect(page.getByRole("region", { name: "Your next step" })).toBeVisible();
    const revisions = page.getByRole("region", { name: "Revision plan" });
    await expect(revisions.getByText("Tomorrow").first()).toBeVisible();
    await expect(page.getByText("+50 XP")).toBeVisible();
  });

  await test.step("dashboard reflects evidence", async () => {
    await page.getByRole("link", { name: "Today" }).click();
    const focus = page.getByRole("region", { name: "Today's focus" });
    await expect(focus).toContainText("2/4");
    await expect(page.getByText("50 XP")).toBeVisible();
    await expect(page.getByText("1-day streak")).toBeVisible();
  });

  await test.step("every screen fits a phone", async () => {
    await page.setViewportSize({ width: 390, height: 844 });
    for (const path of ["/today", "/roadmap", "/progress"]) {
      await page.goto(path);
      await expectNoHorizontalScroll(page);
    }
    await page.goBack();
  });
});

test("protected routes redirect to login", async ({ page }) => {
  await page.goto("/today");
  await expect(page).toHaveURL(/\/login\?next=%2Ftoday/);
  await expect(page.getByRole("heading", { name: "Log in" })).toBeVisible();
});

test("wrong password shows the error state", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill("nobody@example.com");
  await page.getByLabel("Password", { exact: true }).fill("not-the-password");
  await page.getByRole("button", { name: "Log in" }).click();
  await expect(page.getByRole("alert").filter({ hasText: "don't match" })).toBeVisible();
});

async function expectNoHorizontalScroll(page: Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow, `horizontal overflow on ${page.url()}`).toBeLessThanOrEqual(1);
}
