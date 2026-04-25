// @vitest-environment node
import { mkdtempSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { resetBirdclawPathsForTests } from "./config";
import { getConversationThread, listDmConversations } from "./queries";
import { resetDatabaseForTests } from "./db";

const listDirectMessagesViaBirdMock = vi.fn();

vi.mock("./bird", () => ({
	listDirectMessagesViaBird: (...args: unknown[]) =>
		listDirectMessagesViaBirdMock(...args),
}));

const tempDirs: string[] = [];

function makeTempHome() {
	const tempDir = mkdtempSync(path.join(os.tmpdir(), "birdclaw-dms-live-"));
	tempDirs.push(tempDir);
	process.env.BIRDCLAW_HOME = tempDir;
	return tempDir;
}

describe("cached live DMs", () => {
	beforeEach(() => {
		listDirectMessagesViaBirdMock.mockReset();
	});

	afterEach(() => {
		resetDatabaseForTests();
		resetBirdclawPathsForTests();
		delete process.env.BIRDCLAW_HOME;

		for (const dir of tempDirs.splice(0)) {
			rmSync(dir, { recursive: true, force: true });
		}
	});

	it("fetches bird DMs, caches them, and syncs them into the local store", async () => {
		makeTempHome();
		listDirectMessagesViaBirdMock.mockResolvedValueOnce({
			success: true,
			conversations: [
				{
					id: "25401953-42",
					participants: [
						{ id: "25401953", username: "steipete", name: "Peter" },
						{ id: "42", username: "sam", name: "Sam Altman" },
					],
					messages: [
						{
							id: "dm_live_1",
							conversationId: "25401953-42",
							text: "Live DM hello",
							createdAt: "2026-04-25T20:00:00.000Z",
							senderId: "42",
							recipientId: "25401953",
							sender: { id: "42", username: "sam", name: "Sam Altman" },
							recipient: {
								id: "25401953",
								username: "steipete",
								name: "Peter",
							},
						},
					],
					lastMessageAt: "2026-04-25T20:00:00.000Z",
				},
			],
			events: [
				{
					id: "dm_live_1",
					conversationId: "25401953-42",
					text: "Live DM hello",
					createdAt: "2026-04-25T20:00:00.000Z",
					senderId: "42",
					recipientId: "25401953",
					sender: { id: "42", username: "sam", name: "Sam Altman" },
					recipient: { id: "25401953", username: "steipete", name: "Peter" },
				},
			],
		});
		const { syncDirectMessagesViaCachedBird } = await import("./dms-live");

		const summary = await syncDirectMessagesViaCachedBird({
			account: "acct_primary",
			limit: 5,
			refresh: true,
		});

		expect(summary).toEqual({
			ok: true,
			source: "bird",
			accountId: "acct_primary",
			conversations: 1,
			messages: 1,
		});
		expect(listDirectMessagesViaBirdMock).toHaveBeenCalledWith({
			maxResults: 5,
		});
		expect(listDmConversations({ search: "hello", limit: 10 })).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					id: "25401953-42",
					accountId: "acct_primary",
					needsReply: true,
					participant: expect.objectContaining({
						handle: "sam",
						displayName: "Sam Altman",
					}),
				}),
			]),
		);
		expect(getConversationThread("25401953-42")?.messages).toEqual([
			expect.objectContaining({
				id: "dm_live_1",
				text: "Live DM hello",
				direction: "inbound",
				sender: expect.objectContaining({ handle: "sam" }),
			}),
		]);
	});

	it("reuses fresh cache without spending another bird call", async () => {
		makeTempHome();
		listDirectMessagesViaBirdMock.mockResolvedValue({
			success: true,
			conversations: [],
			events: [],
		});
		const { syncDirectMessagesViaCachedBird } = await import("./dms-live");

		await syncDirectMessagesViaCachedBird({
			account: "acct_primary",
			limit: 5,
		});
		const second = await syncDirectMessagesViaCachedBird({
			account: "acct_primary",
			limit: 5,
		});

		expect(second.source).toBe("cache");
		expect(listDirectMessagesViaBirdMock).toHaveBeenCalledTimes(1);
	});
});
