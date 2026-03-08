import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
	getQueryEnvelope: vi.fn(),
}));

vi.mock("#/lib/queries", () => ({
	getQueryEnvelope: mocks.getQueryEnvelope,
}));

import { Route } from "./status";

describe("status api route", () => {
	it("returns the query envelope as json", async () => {
		mocks.getQueryEnvelope.mockResolvedValue({
			stats: { home: 4, mentions: 2, dms: 4, needsReply: 2, inbox: 4 },
			accounts: [{ id: "acct_primary" }],
			archives: [{ path: "/tmp/archive.zip" }],
			transport: { statusText: "xurl available" },
		});

		const response = await Route.options.server.handlers.GET({
			request: new Request("http://birdclaw.test/api/status"),
		});

		await expect(response.json()).resolves.toEqual({
			stats: { home: 4, mentions: 2, dms: 4, needsReply: 2, inbox: 4 },
			accounts: [{ id: "acct_primary" }],
			archives: [{ path: "/tmp/archive.zip" }],
			transport: { statusText: "xurl available" },
		});
		expect(response.headers.get("content-type")).toBe("application/json");
	});
});
