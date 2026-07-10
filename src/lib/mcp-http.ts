import { createHash, timingSafeEqual } from "node:crypto";
import { isIP } from "node:net";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { LOCAL_WEB_PEER_HEADER } from "./local-peer";
import { createBirdclawMcpServer } from "./mcp-tools";

const MCP_MAX_BODY_BYTES = 64 * 1024;
const MCP_REQUEST_TIMEOUT_MS = 30_000;
const MCP_RATE_CAPACITY = 20;
const MCP_RATE_REFILL_PER_MS = 1 / 1_000;
const MCP_MAX_CONCURRENT = 4;

type McpConfig = {
	token: string;
	publicUrl: URL;
};

type RateBucket = {
	tokens: number;
	updatedAt: number;
	active: number;
};

const rateBuckets = new Map<string, RateBucket>();

class McpHttpError extends Error {
	constructor(
		readonly status: number,
		message: string,
		readonly headers?: HeadersInit,
	) {
		super(message);
	}
}

class McpTimeoutError extends Error {}

function responseHeaders(init?: HeadersInit) {
	const headers = new Headers(init);
	headers.set("cache-control", "no-store");
	headers.set("content-type", "application/json");
	headers.set("x-content-type-options", "nosniff");
	return headers;
}

function jsonRpcErrorResponse(
	status: number,
	message: string,
	code = -32000,
	headers?: HeadersInit,
) {
	return new Response(
		JSON.stringify({
			jsonrpc: "2.0",
			error: { code, message },
			id: null,
		}),
		{ status, headers: responseHeaders(headers) },
	);
}

function isLoopbackHostname(hostname: string) {
	const normalized = hostname.toLowerCase().replace(/^\[|\]$/g, "");
	return (
		normalized === "localhost" ||
		normalized === "::1" ||
		(isIP(normalized) === 4 && normalized.split(".")[0] === "127")
	);
}

function resolveMcpConfig(): McpConfig | null {
	const token = process.env.BIRDCLAW_MCP_TOKEN;
	const publicUrlValue = process.env.BIRDCLAW_MCP_PUBLIC_URL;
	if (!token || !publicUrlValue) return null;
	if (
		token !== token.trim() ||
		/\s/u.test(token) ||
		Buffer.byteLength(token) < 32
	) {
		return null;
	}

	let publicUrl: URL;
	try {
		publicUrl = new URL(publicUrlValue);
	} catch {
		return null;
	}
	if (
		publicUrl.pathname !== "/mcp" ||
		publicUrl.search ||
		publicUrl.hash ||
		publicUrl.username ||
		publicUrl.password ||
		(publicUrl.protocol !== "https:" &&
			!(
				publicUrl.protocol === "http:" && isLoopbackHostname(publicUrl.hostname)
			))
	) {
		return null;
	}
	return { token, publicUrl };
}

function tokenDigest(value: string) {
	return createHash("sha256").update(value).digest();
}

function authorizeRequest(request: Request, config: McpConfig) {
	const authorization = request.headers.get("authorization") ?? "";
	const match = authorization.match(/^Bearer ([^\s,]+)$/iu);
	const candidate = match?.[1] ?? "";
	const expectedDigest = tokenDigest(config.token);
	const candidateDigest = tokenDigest(candidate);
	if (!match || !timingSafeEqual(expectedDigest, candidateDigest)) {
		throw new McpHttpError(401, "Unauthorized", {
			"www-authenticate": 'Bearer realm="birdclaw-mcp"',
		});
	}
	return expectedDigest.toString("hex");
}

function validateHostAndOrigin(request: Request, config: McpConfig) {
	if (
		process.env.BIRDCLAW_LOCAL_WEB !== "socket" ||
		request.headers.get(LOCAL_WEB_PEER_HEADER) !== "1"
	) {
		throw new McpHttpError(403, "MCP requires a loopback origin connection");
	}
	const requestUrl = new URL(request.url);
	if (
		requestUrl.pathname !== "/mcp" ||
		requestUrl.host.toLowerCase() !== config.publicUrl.host.toLowerCase()
	) {
		throw new McpHttpError(403, "Forbidden host");
	}

	const origin = request.headers.get("origin");
	if (origin) {
		let parsedOrigin: URL;
		try {
			parsedOrigin = new URL(origin);
		} catch {
			throw new McpHttpError(403, "Forbidden origin");
		}
		if (
			origin !== parsedOrigin.origin ||
			parsedOrigin.origin !== config.publicUrl.origin
		) {
			throw new McpHttpError(403, "Forbidden origin");
		}
	}
	if (request.headers.get("sec-fetch-site") === "cross-site") {
		throw new McpHttpError(403, "Cross-site requests are disabled");
	}
}

function acquireRateLimit(principal: string) {
	const now = performance.now();
	const bucket = rateBuckets.get(principal) ?? {
		tokens: MCP_RATE_CAPACITY,
		updatedAt: now,
		active: 0,
	};
	bucket.tokens = Math.min(
		MCP_RATE_CAPACITY,
		bucket.tokens + (now - bucket.updatedAt) * MCP_RATE_REFILL_PER_MS,
	);
	bucket.updatedAt = now;
	rateBuckets.set(principal, bucket);

	if (bucket.active >= MCP_MAX_CONCURRENT) {
		throw new McpHttpError(429, "Too many concurrent MCP requests", {
			"retry-after": "1",
		});
	}
	if (bucket.tokens < 1) {
		const retryAfter = Math.max(
			1,
			Math.ceil((1 - bucket.tokens) / MCP_RATE_REFILL_PER_MS / 1_000),
		);
		throw new McpHttpError(429, "MCP request rate limit exceeded", {
			"retry-after": String(retryAfter),
		});
	}

	bucket.tokens -= 1;
	bucket.active += 1;
	let released = false;
	return () => {
		if (released) return;
		released = true;
		bucket.active = Math.max(0, bucket.active - 1);
	};
}

function isJsonContentType(value: string | null) {
	return value?.split(";", 1)[0]?.trim().toLowerCase() === "application/json";
}

async function readJsonBody(request: Request, deadlineSignal?: AbortSignal) {
	if (!isJsonContentType(request.headers.get("content-type"))) {
		throw new McpHttpError(415, "Content-Type must be application/json");
	}
	const contentLength = request.headers.get("content-length");
	if (contentLength) {
		if (!/^\d+$/u.test(contentLength.trim())) {
			throw new McpHttpError(400, "Invalid Content-Length");
		}
		if (Number(contentLength) > MCP_MAX_BODY_BYTES) {
			throw new McpHttpError(413, "MCP request body is too large");
		}
	}
	if (!request.body) {
		throw new McpHttpError(400, "Missing MCP request body");
	}

	const reader = request.body.getReader();
	let abortKind: "client" | "deadline" | undefined;
	const cancelReader = () => {
		void reader.cancel().catch(() => undefined);
	};
	const onClientAbort = () => {
		abortKind = "client";
		cancelReader();
	};
	const onDeadline = () => {
		abortKind = "deadline";
		cancelReader();
	};
	request.signal.addEventListener("abort", onClientAbort, { once: true });
	deadlineSignal?.addEventListener("abort", onDeadline, { once: true });

	const throwIfAborted = () => {
		if (abortKind === "deadline" || deadlineSignal?.aborted) {
			throw new McpTimeoutError();
		}
		if (abortKind === "client" || request.signal.aborted) {
			throw new McpHttpError(400, "MCP request was aborted");
		}
	};
	const chunks: Uint8Array[] = [];
	let total = 0;
	try {
		throwIfAborted();
		for (;;) {
			const { done, value } = await reader.read();
			throwIfAborted();
			if (done) break;
			total += value.byteLength;
			if (total > MCP_MAX_BODY_BYTES) {
				await reader.cancel();
				throw new McpHttpError(413, "MCP request body is too large");
			}
			chunks.push(value);
		}
	} finally {
		request.signal.removeEventListener("abort", onClientAbort);
		deadlineSignal?.removeEventListener("abort", onDeadline);
	}
	const body = Buffer.concat(
		chunks.map((chunk) => Buffer.from(chunk)),
	).toString("utf8");
	let parsed: unknown;
	try {
		parsed = JSON.parse(body) as unknown;
	} catch {
		throw new McpHttpError(400, "Invalid JSON request body");
	}
	if (Array.isArray(parsed)) {
		throw new McpHttpError(400, "JSON-RPC batches are disabled");
	}
	return parsed;
}

async function withRequestDeadline<T>(
	operation: (signal: AbortSignal) => Promise<T>,
	timeoutMs: number,
) {
	const controller = new AbortController();
	let timeout: ReturnType<typeof setTimeout> | undefined;
	try {
		return await Promise.race([
			operation(controller.signal),
			new Promise<never>((_, reject) => {
				timeout = setTimeout(() => {
					controller.abort();
					reject(new McpTimeoutError());
				}, timeoutMs);
			}),
		]);
	} finally {
		if (timeout) clearTimeout(timeout);
	}
}

function secureResponse(response: Response) {
	const headers = new Headers(response.headers);
	headers.set("cache-control", "no-store");
	headers.set("x-content-type-options", "nosniff");
	return new Response(response.body, {
		status: response.status,
		statusText: response.statusText,
		headers,
	});
}

async function handleBirdclawMcpRequestWithTimeout(
	request: Request,
	requestTimeoutMs: number,
) {
	let release: (() => void) | undefined;
	let server: ReturnType<typeof createBirdclawMcpServer> | undefined;
	let transport: WebStandardStreamableHTTPServerTransport | undefined;
	try {
		const config = resolveMcpConfig();
		if (!config) {
			throw new McpHttpError(503, "Birdclaw MCP is not configured");
		}
		const principal = authorizeRequest(request, config);
		validateHostAndOrigin(request, config);

		if (request.method !== "POST") {
			return jsonRpcErrorResponse(405, "Method not allowed", -32000, {
				allow: "POST",
			});
		}

		release = acquireRateLimit(principal);
		const response = await withRequestDeadline(async (deadlineSignal) => {
			const parsedBody = await readJsonBody(request, deadlineSignal);
			server = createBirdclawMcpServer();
			transport = new WebStandardStreamableHTTPServerTransport({
				sessionIdGenerator: undefined,
				enableJsonResponse: true,
			});
			await server.connect(transport);
			if (deadlineSignal.aborted) throw new McpTimeoutError();
			return transport.handleRequest(request, { parsedBody });
		}, requestTimeoutMs);
		return secureResponse(response);
	} catch (error) {
		if (error instanceof McpHttpError) {
			return jsonRpcErrorResponse(
				error.status,
				error.message,
				-32000,
				error.headers,
			);
		}
		if (error instanceof McpTimeoutError) {
			return jsonRpcErrorResponse(504, "MCP request timed out", -32603);
		}
		return jsonRpcErrorResponse(500, "Internal MCP server error", -32603);
	} finally {
		release?.();
		await Promise.allSettled([server?.close(), transport?.close()]);
	}
}

export function handleBirdclawMcpRequest(request: Request) {
	return handleBirdclawMcpRequestWithTimeout(request, MCP_REQUEST_TIMEOUT_MS);
}

export const __test__ = {
	resolveMcpConfig,
	tokenDigest,
	isJsonContentType,
	readJsonBody,
	handleRequestWithTimeout: handleBirdclawMcpRequestWithTimeout,
	resetRateLimits() {
		rateBuckets.clear();
	},
};
