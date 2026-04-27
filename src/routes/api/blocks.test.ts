// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { getRouteHandler } from "#/test/route-handlers";

const getBlocksResponseMock = vi.fn();

vi.mock("#/lib/blocks", () => ({
	getBlocksResponse: (...args: unknown[]) => getBlocksResponseMock(...args),
}));

import { Route } from "./blocks";

const GET = getRouteHandler(Route, "GET");

describe("api blocks route", () => {
	it("parses account, search, and limit", async () => {
		getBlocksResponseMock.mockReturnValue({ items: [], matches: [] });

		const response = await GET({
			request: new Request(
				"http://localhost/api/blocks?account=acct_primary&search=amelia&limit=9",
			),
		});

		expect(getBlocksResponseMock).toHaveBeenCalledWith({
			accountId: "acct_primary",
			search: "amelia",
			limit: 9,
		});
		expect(response.status).toBe(200);
	});

	it("defaults invalid limits", async () => {
		getBlocksResponseMock.mockReturnValue({ items: [], matches: [] });

		await GET({
			request: new Request("http://localhost/api/blocks?limit=wat"),
		});

		expect(getBlocksResponseMock).toHaveBeenCalledWith({
			accountId: undefined,
			search: undefined,
			limit: 12,
		});
	});
});
