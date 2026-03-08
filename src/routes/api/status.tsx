import { createFileRoute } from "@tanstack/react-router";
import { getQueryEnvelope } from "#/lib/queries";

export const Route = createFileRoute("/api/status")({
	server: {
		handlers: {
			GET: async () =>
				new Response(JSON.stringify(await getQueryEnvelope()), {
					headers: {
						"content-type": "application/json",
					},
				}),
		},
	},
});
