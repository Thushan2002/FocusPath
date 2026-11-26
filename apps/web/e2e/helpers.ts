import { expect, type Page } from "@playwright/test";

/** Sign up a fresh learner, onboard, and set the first concept as today's focus. */
export async function signUpAndFocus(page: Page): Promise<{ email: string }> {
  const email = `e2e-${Date.now()}-${Math.floor(Math.random() * 1e6)}@example.com`;
  await page.goto("/signup");
  await page.getByLabel("Full name").fill("Ada Learner");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill("Focus2026!");
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page).toHaveURL(/\/onboarding/);
  await page.getByRole("button", { name: "Become an AI Engineer" }).click();
  await page.getByRole("button", { name: "Generate my roadmap" }).click();
  await expect(page).toHaveURL(/\/roadmap$/, { timeout: 60_000 });
  await page.getByRole("complementary", { name: "Topic detail" }).getByRole("button", { name: "Set as today's focus" }).click();
  await expect(page).toHaveURL(/\/today/);
  return { email };
}
