import { formatCompactNumber, formatShortTimestamp } from "#/lib/present";
import type { TimelineItem } from "#/lib/types";
import { AvatarChip } from "./AvatarChip";
import { EmbeddedTweetCard } from "./EmbeddedTweetCard";
import { ProfilePreview } from "./ProfilePreview";
import { TweetMediaGrid } from "./TweetMediaGrid";
import { TweetRichText } from "./TweetRichText";

function getVisibleUrlCards(item: TimelineItem) {
	const quotedUrl = item.quotedTweet ? item.quotedTweet.id : null;
	return (item.entities.urls ?? []).filter((entry) => {
		if (!item.quotedTweet) return true;
		return !entry.expandedUrl.includes(quotedUrl ?? "");
	});
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
					<AvatarChip
						hue={item.author.avatarHue}
						name={item.author.displayName}
					/>
					<div>
						<ProfilePreview profile={item.author}>
							<div className="identity-row">
								<strong>{item.author.displayName}</strong>
								<span>@{item.author.handle}</span>
								<span className="muted-dot" />
								<span>
									{formatCompactNumber(item.author.followersCount)} followers
								</span>
							</div>
						</ProfilePreview>
						<p className="bio-line">{item.author.bio}</p>
					</div>
				</div>
				<div className="meta-stack">
					<span
						className={item.isReplied ? "pill pill-soft" : "pill pill-alert"}
					>
						{item.isReplied ? "replied" : "needs reply"}
					</span>
					<span className="timestamp">
						{formatShortTimestamp(item.createdAt)}
					</span>
				</div>
			</header>
			<TweetRichText entities={item.entities} text={item.text} />
			<TweetMediaGrid items={item.media} />
			{item.replyToTweet ? (
				<EmbeddedTweetCard item={item.replyToTweet} label="In reply to" />
			) : null}
			{item.quotedTweet ? (
				<EmbeddedTweetCard item={item.quotedTweet} label="Quoted tweet" />
			) : null}
			{getVisibleUrlCards(item).map((entry) => (
				<a
					key={entry.expandedUrl}
					className="link-preview-card"
					href={entry.expandedUrl}
					rel="noreferrer"
					target="_blank"
				>
					<strong>{entry.title ?? entry.displayUrl}</strong>
					<span>{entry.description ?? entry.displayUrl}</span>
					<span className="timestamp">{entry.displayUrl}</span>
				</a>
			))}
			<footer className="card-footer">
				<div className="metric-row">
					<span>{formatCompactNumber(item.likeCount)} likes</span>
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
