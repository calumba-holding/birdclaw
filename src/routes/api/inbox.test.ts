// @vitest-environment node
import { describe, expect, it, vi } from "vitest";

const listInboxItemsMock = vi.fn();

vi.mock("#/lib/inbox", () => ({
	listInboxItems: (...args: unknown[]) => listInboxItemsMock(...args),
}));

import { Route } from "./inbox";

describe("api inbox route", () => {
	it("parses inbox filters", async () => {
		listInboxItemsMock.mockReturnValue({
			items: [],
			stats: { total: 0, openai: 0, heuristic: 0 },
		});
		const response = await Route.options.server.handlers.GET({
			request: new Request(
				"http://localhost/api/inbox?kind=dms&minScore=55&hideLowSignal=1&limit=5",
			),
		});

		expect(listInboxItemsMock).toHaveBeenCalledWith({
			kind: "dms",
			minScore: 55,
			hideLowSignal: true,
			limit: 5,
		});
		expect(response.status).toBe(200);
	});

	it("falls back to mixed kind and default limit for invalid params", async () => {
		listInboxItemsMock.mockReturnValue({
			items: [],
			stats: { total: 0, openai: 0, heuristic: 0 },
		});

		await Route.options.server.handlers.GET({
			request: new Request(
				"http://localhost/api/inbox?kind=nope&minScore=bad&limit=nan",
			),
		});

		expect(listInboxItemsMock).toHaveBeenCalledWith({
			kind: "mixed",
			minScore: undefined,
			hideLowSignal: false,
			limit: 20,
		});
	});
});
