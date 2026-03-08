import { createFileRoute } from "@tanstack/react-router";
import { createDmReply, createPost, createTweetReply } from "#/lib/queries";

export const Route = createFileRoute("/api/action")({
	server: {
		handlers: {
			POST: async ({ request }) => {
				const body = (await request.json()) as Record<string, string>;
				let result: unknown;

				if (body.kind === "post") {
					result = await createPost(
						body.accountId || "acct_primary",
						body.text || "",
					);
				} else if (body.kind === "replyTweet") {
					result = await createTweetReply(
						body.accountId || "acct_primary",
						body.tweetId || "",
						body.text || "",
					);
				} else if (body.kind === "replyDm") {
					result = await createDmReply(
						body.conversationId || "",
						body.text || "",
					);
				} else {
					return new Response(
						JSON.stringify({ ok: false, message: "Unknown action kind" }),
						{
							status: 400,
							headers: { "content-type": "application/json" },
						},
					);
				}

				return new Response(JSON.stringify(result), {
					headers: {
						"content-type": "application/json",
					},
				});
			},
		},
	},
});
