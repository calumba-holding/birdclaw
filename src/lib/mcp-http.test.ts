// @vitest-environment node
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { resetBirdclawPathsForTests } from "./config";
import {
	getDatabaseRuntimeMetrics,
	resetDatabaseRuntimeMetricsForTests,
} from "./database-metrics";
import { getNativeDb, resetDatabaseForTests } from "./db";
import { LOCAL_WEB_PEER_HEADER } from "./local-peer";
import { __test__, handleBirdclawMcpRequest } from "./mcp-http";
import { __test__ as toolTest } from "./mcp-tools";

const token = "birdclaw-mcp-test-token-0123456789abcdef";
const publicUrl = "https://mcp.birdclaw.test/mcp";
let tempHome: string;

function rpcRequest(
	body: unknown,
	{
		url = "http://mcp.birdclaw.test/mcp",
		authorization = `Bearer ${token}`,
		origin,
		contentType = "application/json",
	}: {
		url?: string;
		authorization?: string;
		origin?: string;
		contentType?: string;
	} = {},
) {
	const headers = new Headers({
		accept: "application/json, text/event-stream",
		authorization,
		"content-type": contentType,
		[LOCAL_WEB_PEER_HEADER]: "1",
		"mcp-protocol-version": "2025-06-18",
	});
	if (origin) headers.set("origin", origin);
	return new Request(url, {
		method: "POST",
		headers,
		body: typeof body === "string" ? body : JSON.stringify(body),
	});
}

async function rpc(body: unknown) {
	const response = await handleBirdclawMcpRequest(rpcRequest(body));
	return {
		response,
		body: (await response.json()) as Record<string, unknown>,
	};
}

describe("Birdclaw MCP HTTP server", () => {
	beforeEach(() => {
		tempHome = mkdtempSync(path.join(os.tmpdir(), "birdclaw-mcp-"));
		process.env.BIRDCLAW_HOME = tempHome;
		process.env.BIRDCLAW_MCP_TOKEN = token;
		process.env.BIRDCLAW_MCP_PUBLIC_URL = publicUrl;
		process.env.BIRDCLAW_LOCAL_WEB = "socket";
		resetBirdclawPathsForTests();
		resetDatabaseForTests();
		__test__.resetRateLimits();
	});

	afterEach(() => {
		resetDatabaseForTests();
		resetBirdclawPathsForTests();
		delete process.env.BIRDCLAW_HOME;
		delete process.env.BIRDCLAW_MCP_TOKEN;
		delete process.env.BIRDCLAW_MCP_PUBLIC_URL;
		delete process.env.BIRDCLAW_LOCAL_WEB;
		__test__.resetRateLimits();
		rmSync(tempHome, { recursive: true, force: true });
	});

	it("stays disabled until both secure settings are configured", async () => {
		delete process.env.BIRDCLAW_MCP_TOKEN;
		const response = await handleBirdclawMcpRequest(
			rpcRequest({ jsonrpc: "2.0", id: 1, method: "ping" }),
		);
		expect(response.status).toBe(503);
		expect(response.headers.get("cache-control")).toBe("no-store");

		process.env.BIRDCLAW_MCP_TOKEN = "too-short";
		const weakTokenResponse = await handleBirdclawMcpRequest(
			rpcRequest({ jsonrpc: "2.0", id: 1, method: "ping" }),
		);
		expect(weakTokenResponse.status).toBe(503);

		process.env.BIRDCLAW_MCP_TOKEN = token;
		process.env.BIRDCLAW_MCP_PUBLIC_URL = "http://127.attacker.example/mcp";
		const fakeLoopbackResponse = await handleBirdclawMcpRequest(
			rpcRequest(
				{ jsonrpc: "2.0", id: 1, method: "ping" },
				{ url: "http://127.attacker.example/mcp" },
			),
		);
		expect(fakeLoopbackResponse.status).toBe(503);
	});

	it("requires its own bearer token and rejects cookies or web tokens", async () => {
		const wrong = await handleBirdclawMcpRequest(
			rpcRequest(
				{ jsonrpc: "2.0", id: 1, method: "ping" },
				{ authorization: "Bearer wrong" },
			),
		);
		expect(wrong.status).toBe(401);
		expect(wrong.headers.get("www-authenticate")).toContain("Bearer");

		const cookieOnly = new Request("http://mcp.birdclaw.test/mcp", {
			method: "POST",
			headers: {
				accept: "application/json, text/event-stream",
				"content-type": "application/json",
				cookie: `birdclaw_token=${token}`,
				[LOCAL_WEB_PEER_HEADER]: "1",
				"x-birdclaw-token": token,
			},
			body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "ping" }),
		});
		expect((await handleBirdclawMcpRequest(cookieOnly)).status).toBe(401);
	});

	it("enforces the configured host and exact browser origin", async () => {
		const directOrigin = await handleBirdclawMcpRequest(
			new Request("http://mcp.birdclaw.test/mcp", {
				method: "POST",
				headers: {
					authorization: `Bearer ${token}`,
					"content-type": "application/json",
				},
				body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "ping" }),
			}),
		);
		expect(directOrigin.status).toBe(403);

		const wrongHost = await handleBirdclawMcpRequest(
			rpcRequest(
				{ jsonrpc: "2.0", id: 1, method: "ping" },
				{ url: "http://evil.example/mcp" },
			),
		);
		expect(wrongHost.status).toBe(403);

		const wrongOrigin = await handleBirdclawMcpRequest(
			rpcRequest(
				{ jsonrpc: "2.0", id: 1, method: "ping" },
				{ origin: "https://evil.example" },
			),
		);
		expect(wrongOrigin.status).toBe(403);

		const sameOrigin = await handleBirdclawMcpRequest(
			rpcRequest(
				{ jsonrpc: "2.0", id: 1, method: "ping" },
				{ origin: "https://mcp.birdclaw.test" },
			),
		);
		expect(sameOrigin.status).toBe(200);
	});

	it("rejects unsupported methods, misleading media types, and large bodies", async () => {
		const get = await handleBirdclawMcpRequest(
			new Request("http://mcp.birdclaw.test/mcp", {
				headers: {
					authorization: `Bearer ${token}`,
					[LOCAL_WEB_PEER_HEADER]: "1",
				},
			}),
		);
		expect(get.status).toBe(405);
		expect(get.headers.get("allow")).toBe("POST");

		const mediaType = await handleBirdclawMcpRequest(
			rpcRequest("{}", { contentType: "text/application/jsontext" }),
		);
		expect(mediaType.status).toBe(415);

		const oversized = await handleBirdclawMcpRequest(
			rpcRequest("x".repeat(64 * 1024 + 1)),
		);
		expect(oversized.status).toBe(413);

		const batch = await handleBirdclawMcpRequest(
			rpcRequest([
				{ jsonrpc: "2.0", id: 1, method: "ping" },
				{ jsonrpc: "2.0", id: 2, method: "ping" },
			]),
		);
		expect(batch.status).toBe(400);
	});

	it("counts the same punctuation-delimited terms as SQLite FTS", () => {
		expect(toolTest.countQueryTerms("one-two,three_four")).toBe(3);
		expect(
			toolTest.countQueryTerms(
				Array.from({ length: 33 }, (_, index) => `term-${String(index)}`).join(
					" ",
				),
			),
		).toBe(66);
	});

	it("rate-limits an authenticated principal", async () => {
		for (let index = 0; index < 20; index += 1) {
			const response = await handleBirdclawMcpRequest(
				rpcRequest({ jsonrpc: "2.0", id: index, method: "ping" }),
			);
			expect(response.status).toBe(200);
		}
		const limited = await handleBirdclawMcpRequest(
			rpcRequest({ jsonrpc: "2.0", id: 21, method: "ping" }),
		);
		expect(limited.status).toBe(429);
		expect(limited.headers.get("retry-after")).toBe("1");
	});

	it("times out and cancels slow request bodies", async () => {
		let cancelled = false;
		const body = new ReadableStream<Uint8Array>({
			start(controller) {
				controller.enqueue(new TextEncoder().encode("{"));
			},
			cancel() {
				cancelled = true;
			},
		});
		const request = new Request("http://mcp.birdclaw.test/mcp", {
			method: "POST",
			headers: {
				authorization: `Bearer ${token}`,
				"content-type": "application/json",
				[LOCAL_WEB_PEER_HEADER]: "1",
			},
			body,
			duplex: "half",
		} as RequestInit & { duplex: "half" });

		const response = await __test__.handleRequestWithTimeout(request, 20);
		expect(response.status).toBe(504);
		expect(cancelled).toBe(true);

		const next = await handleBirdclawMcpRequest(
			rpcRequest({ jsonrpc: "2.0", id: 1, method: "ping" }),
		);
		expect(next.status).toBe(200);
	});

	it("advertises only the two local read-only tools", async () => {
		const { response, body } = await rpc({
			jsonrpc: "2.0",
			id: 1,
			method: "tools/list",
			params: {},
		});
		expect(response.status).toBe(200);
		const result = body.result as {
			tools: Array<{
				name: string;
				annotations: Record<string, boolean>;
			}>;
		};
		expect(result.tools.map((tool) => tool.name)).toEqual([
			"search_tweets",
			"get_tweet_thread",
		]);
		for (const tool of result.tools) {
			expect(tool.annotations).toMatchObject({
				readOnlyHint: true,
				destructiveHint: false,
				idempotentHint: true,
				openWorldHint: false,
			});
		}
	});

	it("works through the official stateless Streamable HTTP client", async () => {
		getNativeDb();
		const fetchImpl: typeof fetch = async (input, init) => {
			const incoming = new Request(input, init);
			const headers = new Headers(incoming.headers);
			headers.set(LOCAL_WEB_PEER_HEADER, "1");
			return handleBirdclawMcpRequest(new Request(incoming, { headers }));
		};
		const transport = new StreamableHTTPClientTransport(new URL(publicUrl), {
			fetch: fetchImpl,
			requestInit: { headers: { authorization: `Bearer ${token}` } },
		});
		const client = new Client({ name: "birdclaw-test", version: "1.0.0" });

		try {
			await client.connect(transport);
			const listed = await client.listTools();
			expect(listed.tools.map((tool) => tool.name)).toEqual([
				"search_tweets",
				"get_tweet_thread",
			]);
			const result = await client.callTool({
				name: "search_tweets",
				arguments: {
					query: "local-first",
					bookmarkedOnly: true,
					limit: 5,
				},
			});
			expect(
				(result.structuredContent as { items: Array<{ id: string }> }).items[0]
					?.id,
			).toBe("tweet_001");
		} finally {
			await client.close();
		}
	});

	it("fails closed instead of creating or migrating a database", async () => {
		resetDatabaseRuntimeMetricsForTests();
		const result = await rpc({
			jsonrpc: "2.0",
			id: 2,
			method: "tools/call",
			params: {
				name: "search_tweets",
				arguments: { query: "anything" },
			},
		});
		expect((result.body.result as { isError: boolean }).isError).toBe(true);
		expect(existsSync(path.join(tempHome, "birdclaw.sqlite"))).toBe(false);
		expect(getDatabaseRuntimeMetrics().connections.writeStatements).toBe(0);
	});

	it("searches and expands only cached tweets without database writes", async () => {
		getNativeDb();
		resetDatabaseRuntimeMetricsForTests();

		const search = await rpc({
			jsonrpc: "2.0",
			id: 2,
			method: "tools/call",
			params: {
				name: "search_tweets",
				arguments: {
					query: "local-first",
					bookmarkedOnly: true,
					limit: 5,
				},
			},
		});
		expect(search.response.status).toBe(200);
		const searchResult = search.body.result as {
			structuredContent: { count: number; items: Array<{ id: string }> };
		};
		expect(searchResult.structuredContent.count).toBeGreaterThan(0);
		expect(searchResult.structuredContent.items[0]?.id).toBe("tweet_001");

		const thread = await rpc({
			jsonrpc: "2.0",
			id: 3,
			method: "tools/call",
			params: {
				name: "get_tweet_thread",
				arguments: { tweetId: "tweet_002", limit: 10 },
			},
		});
		expect(thread.response.status).toBe(200);
		const threadResult = thread.body.result as {
			structuredContent: {
				anchorId: string;
				items: Array<{ id: string }>;
			};
		};
		expect(threadResult.structuredContent.anchorId).toBe("tweet_002");
		expect(
			threadResult.structuredContent.items.map((item) => item.id),
		).toContain("tweet_001");
		expect(getDatabaseRuntimeMetrics().connections.writeStatements).toBe(0);
	});
});
