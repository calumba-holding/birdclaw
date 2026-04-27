// @vitest-environment node
import { describe, expect, it, vi } from "vitest";

const queryResourceMock = vi.fn();

vi.mock("#/lib/queries", () => ({
	queryResource: (...args: unknown[]) => queryResourceMock(...args),
}));

import { Route } from "./query";

describe("api query route", () => {
	it("parses dm filters", async () => {
		queryResourceMock.mockReturnValue({ resource: "dms", items: [] });
		const response = await Route.options.server.handlers.GET({
			request: new Request(
				"http://localhost/api/query?resource=dms&replyFilter=unreplied&minFollowers=10&minInfluenceScore=90&sort=influence",
			),
		});

		expect(queryResourceMock).toHaveBeenCalledWith(
			"dms",
			expect.objectContaining({
				replyFilter: "unreplied",
				minFollowers: 10,
				minInfluenceScore: 90,
				sort: "influence",
			}),
		);
		expect(response.status).toBe(200);
	});

	it("defaults invalid reply filters to all", async () => {
		queryResourceMock.mockReturnValue({ resource: "home", items: [] });
		await Route.options.server.handlers.GET({
			request: new Request(
				"http://localhost/api/query?resource=home&replyFilter=bad&since=2020-01-01&until=2021-01-01&qualityFilter=summary&originalsOnly=true",
			),
		});

		expect(queryResourceMock).toHaveBeenCalledWith(
			"home",
			expect.objectContaining({
				replyFilter: "all",
				resource: "home",
				since: "2020-01-01",
				until: "2021-01-01",
				includeReplies: false,
				qualityFilter: "summary",
			}),
		);
	});

	it("drops invalid numeric filters and defaults sort", async () => {
		queryResourceMock.mockReturnValue({ resource: "dms", items: [] });
		await Route.options.server.handlers.GET({
			request: new Request(
				"http://localhost/api/query?resource=dms&minFollowers=wat&maxFollowers=33&maxInfluenceScore=nope&sort=bad",
			),
		});

		expect(queryResourceMock).toHaveBeenCalledWith(
			"dms",
			expect.objectContaining({
				minFollowers: undefined,
				maxFollowers: 33,
				maxInfluenceScore: undefined,
				sort: "recent",
			}),
		);
	});
});
