import { expect, test } from "@playwright/test";

test("navigates across the primary surfaces", async ({ page }) => {
	await page.goto("/");

	await expect(
		page.getByRole("heading", { name: "Quiet signal for X." }),
	).toBeVisible();
	await expect(
		page.getByRole("heading", {
			name: "Read first. Act only where signal survives.",
		}),
	).toBeVisible();

	await page.getByRole("link", { name: "Mentions" }).click();
	await expect(
		page.getByRole("heading", {
			name: "Keep the actionable queue small and visible.",
		}),
	).toBeVisible();

	await page.getByRole("link", { name: "DMs" }).click();
	await expect(
		page.getByRole("heading", {
			name: "Influence, bio, and reply state. No hunting.",
		}),
	).toBeVisible();

	await page.getByRole("link", { name: "Inbox" }).click();
	await expect(
		page.getByRole("heading", { name: "AI triage for mentions and DMs." }),
	).toBeVisible();
	await expect(page.locator(".inbox-card")).toHaveCount(3);
});

test("filters the home timeline by reply state", async ({ page }) => {
	await page.goto("/");

	const cards = page.locator(".content-card");
	await expect(cards).toHaveCount(4);

	await page.getByRole("button", { name: /^replied$/ }).click();
	await expect(cards).toHaveCount(1);
	await expect(cards.first()).toContainText("The best product teams");

	await page.getByRole("button", { name: /^unreplied$/ }).click();
	await expect(cards).toHaveCount(3);
});

test("replies to an unreplied mention and clears it from the queue", async ({
	page,
}) => {
	await page.goto("/mentions");

	await expect(page.locator(".content-card")).toHaveCount(1);

	page.once("dialog", (dialog) =>
		dialog.accept("Replayability is the point where sync earns its keep."),
	);
	await page.getByRole("button", { name: "Reply" }).click();

	await expect(page.locator(".content-card")).toHaveCount(0);
});

test("filters dms, shows sender context, and sends a reply", async ({
	page,
}) => {
	await page.goto("/dms");

	await page.getByRole("button", { name: "all" }).click();
	await page.getByPlaceholder("Min followers").fill("1000000");

	await expect(page.locator(".dm-list-item")).toHaveCount(1);
	await expect(page.locator(".context-bio")).toContainText("Working on AGI");
	await expect(page.locator(".context-handle")).toHaveText("@sam");

	await page.getByPlaceholder("Reply to @sam").fill("Will send the sketch.");
	await page.getByRole("button", { name: "Send reply" }).click();

	await expect(page.getByPlaceholder("Reply to @sam")).toHaveValue("");
	await expect(page.locator(".message-bubble-outbound").last()).toContainText(
		"Will send the sketch.",
	);
});

test("replies from the inbox dm queue", async ({ page }) => {
	await page.goto("/inbox");

	await page.getByRole("button", { name: "dms" }).click();

	const ameliaCard = page.locator(".inbox-card").filter({
		hasText: "DM from Amelia N",
	});

	await expect(ameliaCard).toHaveCount(1);
	await ameliaCard.getByRole("button", { name: "Reply" }).click();
	await ameliaCard
		.getByPlaceholder("Reply to @amelia")
		.fill("Please send the mock.");
	await ameliaCard.getByRole("button", { name: "Send" }).click();

	await expect(ameliaCard).toHaveCount(0);
});
