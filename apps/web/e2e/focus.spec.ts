import { expect, test } from "@playwright/test";
import { signUpAndFocus } from "./helpers";

test("focus workspace: run tests in Pyodide, hints, solve, explain, tutor, switch guard", async ({ page }) => {
  test.setTimeout(240_000);
  page.on("pageerror", (e) => console.log("PAGEERROR", e.message, e.stack?.split("\n").slice(0, 4).join(" | ")));
  page.on("console", (m) => m.type() === "error" && console.log("CONSOLE", m.text().slice(0, 1500)));
  await signUpAndFocus(page);
  await page.getByRole("link", { name: "Start focus session" }).click();
  await expect(page).toHaveURL(/\/focus\//);
  await expect(page.getByText("Focus mode")).toBeVisible();

  const exercise = page.getByRole("region", { name: /scale it/ }).first();
  await expect(exercise).toBeVisible({ timeout: 30_000 });

  await test.step("starter code fails its tests in the browser runner", async () => {
    await exercise.getByRole("button", { name: "Run tests" }).click();
    // First run downloads Python (Pyodide) from the CDN.
    await expect(exercise.getByText(/✗ scales 2 — AssertionError: None != 4/)).toBeVisible({ timeout: 90_000 });
  });

  await test.step("hints are progressive", async () => {
    const tutor = page.getByRole("complementary", { name: "AI tutor" });
    await tutor.getByRole("button", { name: "Show a hint" }).click();
    await expect(tutor.getByText("1 of 3 used")).toBeVisible();
    await expect(tutor.getByRole("button", { name: "Show next hint" })).toBeVisible();
  });

  await test.step("fix the code, pass, submit", async () => {
    await exercise.locator(".cm-content").click();
    await page.keyboard.press("ControlOrMeta+A");
    await page.keyboard.insertText("def scale(x):\n    return x * 2\n");
    await exercise.getByRole("button", { name: "Run tests" }).click();
    await expect(exercise.getByText("✓ scales 2")).toBeVisible({ timeout: 30_000 });
    await expect(exercise.getByText("✓ scales 0")).toBeVisible();
    await exercise.getByRole("button", { name: "Submit solution" }).click();
    await expect(exercise.getByText(/Solved — all 2 tests pass\. \+20 XP/)).toBeVisible();
  });

  await test.step("explanation counts as knowledge evidence", async () => {
    await page
      .getByLabel("Explain it in your own words")
      .fill("A variable is a name that points at a value. Python figures out the type from the value, so x = 3 is an int and x = 'hi' is a string, and I can convert between them with int() or str().");
    await page.getByRole("button", { name: "Check my explanation" }).click();
    await expect(page.getByText("Counts as evidence.")).toBeVisible();
  });

  await test.step("tutor answers with context", async () => {
    const tutor = page.getByRole("complementary", { name: "AI tutor" });
    await tutor.getByLabel("Ask the tutor").fill("Why return instead of print?");
    await tutor.getByRole("button", { name: "Send" }).click();
    await expect(tutor.getByText(/return hands it back to the caller/)).toBeVisible();
  });

  await test.step("switching topic guides instead of blocking", async () => {
    await page.getByRole("button", { name: "Switch topic" }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByLabel("Topic").fill("React");
    await dialog.getByRole("button", { name: "Continue" }).click();
    await expect(dialog.getByRole("heading", { name: /Switch to React before finishing Variables and data types\?/ })).toBeVisible();
    await expect(dialog).toContainText("isn't on your Become an AI Engineer path yet");
    await dialog.getByRole("button", { name: /Keep my focus/ }).click();
    await expect(dialog).toBeHidden();
  });

  await test.step("dashboard shows the practical evidence", async () => {
    await page.getByRole("link", { name: "Exit focus mode" }).click();
    await expect(page.getByText("35 XP")).toBeVisible();
    const week = page.getByRole("region", { name: "This week" });
    await expect(week.getByText("exercises solved")).toBeVisible();
    await expect(week).toContainText("1exercises solved");
  });
});
