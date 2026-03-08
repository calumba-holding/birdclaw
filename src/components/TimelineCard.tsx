import type { TimelineItem } from "#/lib/types";

function formatCount(value: number) {
	return new Intl.NumberFormat("en", { notation: "compact" }).format(value);
}

function formatTime(value: string) {
	return new Intl.DateTimeFormat("en", {
		hour: "numeric",
		minute: "2-digit",
		month: "short",
		day: "numeric",
	}).format(new Date(value));
}

export function TimelineCard({
	item,
	onReply,
}: {
	item: TimelineItem;
	onReply: (tweetId: string) => void;
}) {
	return (
		<article className="content-card">
			<header className="card-header">
				<div className="identity-block">
					<div
						className="avatar-chip"
						style={{ backgroundColor: `hsl(${item.author.avatarHue} 72% 50%)` }}
					>
						{item.author.displayName
							.split(" ")
							.map((part) => part[0])
							.join("")
							.slice(0, 2)}
					</div>
					<div>
						<div className="identity-row">
							<strong>{item.author.displayName}</strong>
							<span>@{item.author.handle}</span>
							<span className="muted-dot" />
							<span>{formatCount(item.author.followersCount)} followers</span>
						</div>
						<p className="bio-line">{item.author.bio}</p>
					</div>
				</div>
				<div className="meta-stack">
					<span
						className={item.isReplied ? "pill pill-soft" : "pill pill-alert"}
					>
						{item.isReplied ? "replied" : "needs reply"}
					</span>
					<span className="timestamp">{formatTime(item.createdAt)}</span>
				</div>
			</header>
			<p className="body-copy">{item.text}</p>
			<footer className="card-footer">
				<div className="metric-row">
					<span>{formatCount(item.likeCount)} likes</span>
					<span>{item.mediaCount} media</span>
					<span>{item.bookmarked ? "bookmarked" : "not bookmarked"}</span>
					<span>{item.accountHandle}</span>
				</div>
				<button
					className="action-button"
					onClick={() => onReply(item.id)}
					type="button"
				>
					Reply
				</button>
			</footer>
		</article>
	);
}
