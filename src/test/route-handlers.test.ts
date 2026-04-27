import { describe, expect, it } from "vitest";
import { getRouteHandler } from "./route-handlers";

describe("getRouteHandler", () => {
	it("throws when route handlers are missing", () => {
		expect(() =>
			getRouteHandler({ options: { server: { handlers: undefined } } }, "GET"),
		).toThrow("Route GET handler missing");
		expect(() =>
			getRouteHandler({ options: { server: { handlers: () => {} } } }, "GET"),
		).toThrow("Route GET handler missing");
	});

	it("throws when the requested method is missing", () => {
		expect(() =>
			getRouteHandler(
				{
					options: {
						server: {
							handlers: {
								POST: () => new Response(null, { status: 204 }),
							},
						},
					},
				},
				"GET",
			),
		).toThrow("Route GET handler missing");
	});
});
