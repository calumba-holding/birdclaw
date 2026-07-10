import { createFileRoute } from "@tanstack/react-router";
import { handleBirdclawMcpRequest } from "#/lib/mcp-http";

export const Route = createFileRoute("/mcp")({
	server: {
		handlers: {
			GET: ({ request }) => handleBirdclawMcpRequest(request),
			POST: ({ request }) => handleBirdclawMcpRequest(request),
			DELETE: ({ request }) => handleBirdclawMcpRequest(request),
			OPTIONS: ({ request }) => handleBirdclawMcpRequest(request),
		},
	},
});
