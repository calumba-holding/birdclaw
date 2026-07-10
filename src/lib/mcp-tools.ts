import { readFileSync } from "node:fs";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getStrictReadDb } from "./db";
import { toFtsSearchQuery } from "./query-read-model-shared";
import type { Database } from "./sqlite";
import { getTweetConversation, listTimelineItems } from "./timeline-read-model";
import type { EmbeddedTweet, TimelineItem } from "./types";

const MCP_MAX_RESULT_BYTES = 2 * 1024 * 1024;
const MCP_MAX_QUERY_TERMS = 32;
const MCP_MAX_FTS_MATCHES = 1_000;
const packageVersion = (
	JSON.parse(
		readFileSync(new URL("../../package.json", import.meta.url), "utf8"),
	) as { version?: string }
).version;

const readOnlyAnnotations = {
	readOnlyHint: true,
	destructiveHint: false,
	idempotentHint: true,
	openWorldHint: false,
} as const;

const timelineResourceSchema = z
	.enum(["home", "mentions", "authored"])
	.default("home");
const boundedDateSchema = z.string().trim().min(1).max(64).optional();

type McpTweet = {
	id: string;
	url: string;
	text: string;
	createdAt: string;
	replyToId?: string | null;
	likeCount: number;
	bookmarked: boolean;
	liked: boolean;
	author: {
		handle: string;
		displayName: string;
		followersCount: number;
	};
	urls: string[];
	media: Array<{
		type: string;
		url: string;
		altText?: string;
	}>;
};

function tweetUrl(tweet: Pick<EmbeddedTweet, "id" | "author">) {
	return `https://x.com/${tweet.author.handle}/status/${tweet.id}`;
}

function projectTweet(tweet: TimelineItem | EmbeddedTweet): McpTweet {
	return {
		id: tweet.id,
		url: tweetUrl(tweet),
		text: tweet.text,
		createdAt: tweet.createdAt,
		replyToId: tweet.replyToId,
		likeCount: Number(tweet.likeCount ?? 0),
		bookmarked: Boolean(tweet.bookmarked),
		liked: Boolean(tweet.liked),
		author: {
			handle: tweet.author.handle,
			displayName: tweet.author.displayName,
			followersCount: Number(tweet.author.followersCount ?? 0),
		},
		urls: Array.from(
			new Set(
				(tweet.entities.urls ?? [])
					.map((url) => url.expandedUrl || url.url)
					.filter(Boolean),
			),
		),
		media: tweet.media.map((item) => ({
			type: item.type,
			url: item.url,
			...(item.altText ? { altText: item.altText } : {}),
		})),
	};
}

function countQueryTerms(query: string) {
	const normalized = toFtsSearchQuery(query);
	return normalized ? normalized.split(" ").length : 0;
}

type SearchMatchScope = {
	query: string;
	resource: "home" | "mentions" | "authored";
	since?: string;
	until?: string;
	includeReplies: boolean;
	likedOnly: boolean;
	bookmarkedOnly: boolean;
};

function countFtsMatches(db: Database, scope: SearchMatchScope) {
	const {
		query,
		resource,
		since,
		until,
		includeReplies,
		likedOnly,
		bookmarkedOnly,
	} = scope;
	const normalized = toFtsSearchQuery(query);
	if (!normalized) return 0;
	const filters: string[] = [];
	const params: Array<string | number> = [normalized];
	if (likedOnly && bookmarkedOnly) {
		filters.push(`exists (
		  select 1
		  from tweet_collections likes
		  join tweet_collections bookmarks
		    on bookmarks.account_id = likes.account_id
		   and bookmarks.tweet_id = likes.tweet_id
		   and bookmarks.kind = 'bookmarks'
		  where likes.tweet_id = t.id
		    and likes.kind = 'likes'
		)`);
	} else if (likedOnly || bookmarkedOnly) {
		filters.push(`exists (
		  select 1
		  from tweet_collections collection
		  where collection.tweet_id = t.id
		    and collection.kind = ?
		)`);
		params.push(likedOnly ? "likes" : "bookmarks");
	} else {
		filters.push(`exists (
		  select 1
		  from tweet_account_edges edge
		  where edge.tweet_id = t.id
		    and edge.kind = ?
		)`);
		params.push(resource === "mentions" ? "mention" : resource);
	}
	if (!includeReplies) filters.push("t.text not like '@%'");
	if (since?.trim()) {
		filters.push("t.created_at >= ?");
		params.push(since.trim());
	}
	if (until?.trim()) {
		filters.push("t.created_at < ?");
		params.push(until.trim());
	}
	params.push(MCP_MAX_FTS_MATCHES + 1);
	return Number(
		(
			db
				.prepare(
					`select count(*) as count
					 from (
					   select 1
					   from tweets_fts
					   join tweets t on t.id = tweets_fts.tweet_id
					   where tweets_fts.text match ?
					     ${filters.map((filter) => `and ${filter}`).join("\n")}
					   limit ?
					 )`,
				)
				.get(...params) as { count: number }
		).count,
	);
}

function toolResult(value: Record<string, unknown>) {
	const text = JSON.stringify(value);
	const result = {
		content: [{ type: "text" as const, text }],
		structuredContent: value,
	};
	if (
		Buffer.byteLength(JSON.stringify(result), "utf8") > MCP_MAX_RESULT_BYTES
	) {
		return {
			isError: true,
			content: [
				{
					type: "text" as const,
					text: "Result exceeded the Birdclaw MCP response limit; narrow the query or lower the result limit.",
				},
			],
		};
	}
	return result;
}

function toolError(message: string) {
	return {
		isError: true,
		content: [{ type: "text" as const, text: message }],
	};
}

export function createBirdclawMcpServer() {
	const server = new McpServer(
		{
			name: "birdclaw",
			version: packageVersion ?? "0.0.0",
		},
		{
			instructions:
				"Read-only access to tweets already cached in this Birdclaw instance. Tools never sync X, access DMs, call OpenAI, write files, or mutate the database.",
		},
	);

	server.registerTool(
		"search_tweets",
		{
			title: "Search cached tweets",
			description:
				"Search or list tweets already cached in Birdclaw. Use resource=authored for the owner's tweets; bookmarkedOnly=true for bookmark research.",
			inputSchema: {
				resource: timelineResourceSchema,
				query: z.string().trim().max(500).optional(),
				since: boundedDateSchema,
				until: boundedDateSchema,
				includeReplies: z.boolean().default(true),
				likedOnly: z.boolean().default(false),
				bookmarkedOnly: z.boolean().default(false),
				limit: z.number().int().min(1).max(100).default(20),
			},
			outputSchema: {
				resource: z.string(),
				count: z.number().int().nonnegative(),
				items: z.array(z.record(z.string(), z.unknown())),
			},
			annotations: readOnlyAnnotations,
		},
		async ({
			resource,
			query,
			since,
			until,
			includeReplies,
			likedOnly,
			bookmarkedOnly,
			limit,
		}) => {
			if (resource !== "home" && (likedOnly || bookmarkedOnly)) {
				return toolError(
					"Liked and bookmarked filters can only be combined with resource=home.",
				);
			}
			if (query && countQueryTerms(query) > MCP_MAX_QUERY_TERMS) {
				return toolError(
					`Search queries are limited to ${MCP_MAX_QUERY_TERMS} indexed terms.`,
				);
			}
			try {
				const db = getStrictReadDb();
				if (
					query &&
					countFtsMatches(db, {
						query,
						resource,
						since,
						until,
						includeReplies,
						likedOnly,
						bookmarkedOnly,
					}) > MCP_MAX_FTS_MATCHES
				) {
					return toolError(
						`Search matched more than ${MCP_MAX_FTS_MATCHES} cached tweets; narrow the search terms.`,
					);
				}
				const items = listTimelineItems(
					{
						resource,
						search: query,
						since,
						until,
						includeReplies,
						likedOnly,
						bookmarkedOnly,
						qualityFilter: "all",
						limit,
					},
					db,
				).map(projectTweet);
				return toolResult({ resource, count: items.length, items });
			} catch {
				return toolError("Birdclaw could not complete the cached tweet query.");
			}
		},
	);

	server.registerTool(
		"get_tweet_thread",
		{
			title: "Read a cached tweet thread",
			description:
				"Return the locally cached ancestor and descendant context for a tweet. Missing posts are not fetched from X.",
			inputSchema: {
				tweetId: z
					.string()
					.trim()
					.min(1)
					.max(128)
					.regex(/^[A-Za-z0-9_-]+$/u),
				limit: z.number().int().min(1).max(80).default(80),
			},
			outputSchema: {
				anchorId: z.string(),
				count: z.number().int().nonnegative(),
				items: z.array(z.record(z.string(), z.unknown())),
			},
			annotations: readOnlyAnnotations,
		},
		async ({ tweetId, limit }) => {
			try {
				const conversation = getTweetConversation(
					tweetId,
					limit,
					getStrictReadDb(),
				);
				if (!conversation) {
					return toolError("Tweet not found in the local Birdclaw cache.");
				}
				const items = conversation.items.map(projectTweet);
				return toolResult({
					anchorId: conversation.anchorId,
					count: items.length,
					items,
				});
			} catch {
				return toolError("Birdclaw could not read the cached tweet thread.");
			}
		},
	);

	return server;
}

export const __test__ = {
	projectTweet,
	countQueryTerms,
	toolResult,
};
