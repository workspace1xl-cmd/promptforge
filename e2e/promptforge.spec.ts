import { expect, test } from "@playwright/test";

test("home page is responsive and exposes navigation", async ({ page }, testInfo) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Turn any SOP into a ship-ready coding prompt." })).toBeVisible();
  await expect(page.getByRole("link", { name: /Software Development/ })).toBeVisible();

  const dimensions = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));
  expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth);

  if (testInfo.project.name === "mobile-chromium") {
    const menu = page.getByRole("button", { name: "Open navigation menu" });
    await expect(menu).toBeVisible();
    await menu.click();
    await expect(page.getByRole("navigation", { name: "Mobile navigation" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Analytics" })).toBeVisible();
  }
});

test("software brief produces a copy-ready prompt", async ({ page }) => {
  test.setTimeout(90_000);
  await page.goto("/generate/software-development");

  const problem = page.getByLabel("What problem does this solve?");
  await expect(problem).toBeVisible();
  await problem.fill(
    "Users need a secure password reset flow without account enumeration.",
  );
  await expect(page.getByRole("button", { name: "Feature / product build" })).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Codex" }).click();
  await page.getByLabel("SOP / client brief").fill(
    "Email a single-use reset link. Tokens expire after 15 minutes. Cover expiry, reuse, invalid tokens, rate limits and rollback.",
  );
  await page.getByLabel("Who is it for?").fill("Existing web application users");
  await page.getByRole("button", { name: "Next →" }).click();
  await expect(page.getByRole("heading", { name: "Surface & stack" })).toBeVisible();
  await page.getByRole("button", { name: "Next →" }).click();
  await expect(page.getByRole("heading", { name: "Quality bar" })).toBeVisible();
  await page.getByRole("button", { name: "Strong security" }).click();
  await page.getByLabel("Coding standards / SOP to enforce").fill(
    "Use existing project conventions, validate server inputs, and test critical paths.",
  );
  await page.getByRole("button", { name: "Next →" }).click();
  await expect(page.getByRole("heading", { name: "Output" })).toBeVisible();
  await page.getByRole("button", { name: "Review with 4 agents & forge →" }).click();

  await expect(page.getByText("READY-TO-PASTE ARTIFACT")).toBeVisible({ timeout: 60_000 });
  await expect(page.getByText("Acceptance", { exact: false })).toBeVisible();
  await expect(page.getByRole("button", { name: "Copy" })).toBeVisible();
});

test("document endpoint extracts markdown safely", async ({ request }) => {
  const response = await request.post("/api/documents/extract", {
    multipart: {
      file: {
        name: "brief.md",
        mimeType: "text/markdown",
        buffer: Buffer.from("# Client brief\nBuild a tested and accessible settings screen."),
      },
    },
  });
  expect(response.ok()).toBeTruthy();
  const body = await response.json();
  expect(body.text).toContain("Build a tested and accessible settings screen.");
});
