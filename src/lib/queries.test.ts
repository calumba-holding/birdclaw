// @vitest-environment node
import { mkdtempSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { resetBirdclawPathsForTests } from "./config";
import { resetDatabaseForTests } from "./db";
import {
	getConversationThread,
	listDmConversations,
	listTimelineItems,
} from "./queries";

const tempRoots: string[] = [];

function setupTempHome() {
	const tempRoot = mkdtempSync(path.join(os.tmpdir(), "birdclaw-test-"));
	tempRoots.push(tempRoot);
	process.env.BIRDCLAW_HOME = tempRoot;
	resetBirdclawPathsForTests();
	resetDatabaseForTests();
}

afterEach(() => {
	resetDatabaseForTests();
	resetBirdclawPathsForTests();
	delete process.env.BIRDCLAW_HOME;

	for (const tempRoot of tempRoots.splice(0)) {
		rmSync(tempRoot, { recursive: true, force: true });
	}
});

describe("birdclaw queries", () => {
	it("filters DM conversations by follower threshold and reply state", () => {
		setupTempHome();

		const unreplied = listDmConversations({
			replyFilter: "unreplied",
			minFollowers: 1000,
		});

		expect(unreplied.map((item) => item.id)).toEqual(["dm_001", "dm_003"]);
		expect(unreplied[0]?.participant.bio).toContain("AGI");
	});

	it("filters DM conversations by derived influence score", () => {
		setupTempHome();

		const highSignal = listDmConversations({
			minInfluenceScore: 120,
			sort: "influence",
		});

		expect(highSignal.map((item) => item.id)).toEqual([
			"dm_001",
			"dm_004",
			"dm_002",
		]);
		expect(highSignal[0]?.influenceLabel).toBe("very high");
	});

	it("hydrates a selected conversation thread with sender context", () => {
		setupTempHome();

		const thread = getConversationThread("dm_003");

		expect(thread?.conversation.participant.handle).toBe("amelia");
		expect(thread?.messages.at(-1)?.sender.handle).toBe("amelia");
	});

	it("returns unreplied mention filters correctly", () => {
		setupTempHome();

		const mentions = listTimelineItems({
			resource: "mentions",
			replyFilter: "unreplied",
		});

		expect(mentions).toHaveLength(1);
		expect(mentions[0]?.author.handle).toBe("amelia");
	});
});
