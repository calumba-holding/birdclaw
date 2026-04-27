import { createFileRoute } from "@tanstack/react-router";
import { maybeAutoUpdateBackup } from "#/lib/backup";
import { getQueryEnvelope } from "#/lib/queries";

export const Route = createFileRoute("/api/status")({
	server: {
		handlers: {
			GET: async () => {
				await maybeAutoUpdateBackup();
				return new Response(JSON.stringify(await getQueryEnvelope()), {
					headers: {
						"content-type": "application/json",
					},
				});
			},
		},
	},
});
