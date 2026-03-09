import type { EmbeddedTweet } from "#/lib/types";
import { ProfilePreview } from "./ProfilePreview";
import { TweetMediaGrid } from "./TweetMediaGrid";
import { TweetRichText } from "./TweetRichText";

function formatTime(value: string) {
	return new Intl.DateTimeFormat("en", {
		hour: "numeric",
		minute: "2-digit",
		month: "short",
		day: "numeric",
	}).format(new Date(value));
}

export function EmbeddedTweetCard({
	item,
	label,
}: {
	item: EmbeddedTweet;
	label: string;
}) {
	return (
		<section className="embedded-tweet-card">
			<p className="embedded-tweet-label">{label}</p>
			<header className="embedded-tweet-header">
				<ProfilePreview profile={item.author}>
					<span className="embedded-tweet-author">
						<strong>{item.author.displayName}</strong>
						<span>@{item.author.handle}</span>
					</span>
				</ProfilePreview>
				<span className="timestamp">{formatTime(item.createdAt)}</span>
			</header>
			<TweetRichText
				className="embedded-tweet-copy"
				entities={item.entities}
				text={item.text}
			/>
			<TweetMediaGrid items={item.media} />
		</section>
	);
}
