import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { TimelineCard } from "#/components/TimelineCard";
import type {
	QueryEnvelope,
	QueryResponse,
	ReplyFilter,
	TimelineItem,
} from "#/lib/types";

export const Route = createFileRoute("/mentions")({
	component: MentionsRoute,
});

function MentionsRoute() {
	const [meta, setMeta] = useState<QueryEnvelope | null>(null);
	const [items, setItems] = useState<TimelineItem[]>([]);
	const [replyFilter, setReplyFilter] = useState<ReplyFilter>("unreplied");
	const [search, setSearch] = useState("");
	const [refreshTick, setRefreshTick] = useState(0);

	useEffect(() => {
		fetch("/api/status")
			.then((response) => response.json())
			.then((data: QueryEnvelope) => setMeta(data));
	}, []);

	useEffect(() => {
		const url = new URL("/api/query", window.location.origin);
		url.searchParams.set("resource", "mentions");
		url.searchParams.set("replyFilter", replyFilter);
		url.searchParams.set("refresh", String(refreshTick));
		if (search.trim()) {
			url.searchParams.set("search", search.trim());
		}

		fetch(url)
			.then((response) => response.json())
			.then((data: QueryResponse) => setItems(data.items as TimelineItem[]));
	}, [refreshTick, replyFilter, search]);

	const subtitle = useMemo(() => {
		if (!meta) return "Loading mentions...";
		return `${meta.stats.mentions} mention/reply items in local store`;
	}, [meta]);

	async function replyToTweet(tweetId: string) {
		const text = window.prompt("Reply text");
		if (!text?.trim()) return;

		await fetch("/api/action", {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({
				kind: "replyTweet",
				accountId: "acct_primary",
				tweetId,
				text,
			}),
		});

		setRefreshTick((value) => value + 1);
	}

	return (
		<main className="page-wrap">
			<section className="hero-shell">
				<div>
					<p className="eyebrow">mentions and replies</p>
					<h2 className="hero-title">
						Keep the actionable queue small and visible.
					</h2>
					<p className="hero-copy">{subtitle}</p>
				</div>
				<div className="hero-controls">
					<input
						className="text-field"
						onChange={(event) => setSearch(event.target.value)}
						placeholder="Search mentions"
						value={search}
					/>
					<div className="segmented">
						{(["all", "replied", "unreplied"] as const).map((value) => (
							<button
								key={value}
								className={
									value === replyFilter ? "segment segment-active" : "segment"
								}
								onClick={() => setReplyFilter(value)}
								type="button"
							>
								{value}
							</button>
						))}
					</div>
				</div>
			</section>

			<section className="stack-grid">
				{items.map((item) => (
					<TimelineCard key={item.id} item={item} onReply={replyToTweet} />
				))}
			</section>
		</main>
	);
}
