import type { TweetMediaItem } from "#/lib/types";

export function TweetMediaGrid({ items }: { items: TweetMediaItem[] }) {
	if (items.length === 0) {
		return null;
	}

	return (
		<div
			className={`tweet-media-grid tweet-media-grid-${Math.min(items.length, 4)}`}
		>
			{items.slice(0, 4).map((item, index) => (
				<a
					key={item.url + String(index)}
					className="tweet-media-tile"
					href={item.url}
					rel="noreferrer"
					target="_blank"
				>
					{item.type === "image" ? (
						<img
							alt={item.altText ?? `Tweet media ${String(index + 1)}`}
							className="tweet-media-image"
							loading="lazy"
							src={item.thumbnailUrl ?? item.url}
						/>
					) : (
						<span className="tweet-media-fallback">
							{item.type === "video"
								? "Video"
								: item.type === "gif"
									? "GIF"
									: "Media"}
						</span>
					)}
				</a>
			))}
		</div>
	);
}
