import { Fragment } from "react";
import type {
	TweetEntities,
	TweetHashtagEntity,
	TweetMentionEntity,
	TweetUrlEntity,
} from "#/lib/types";
import { ProfilePreview } from "./ProfilePreview";

type Segment =
	| ({ kind: "mention" } & TweetMentionEntity)
	| ({ kind: "url" } & TweetUrlEntity)
	| ({ kind: "hashtag" } & TweetHashtagEntity);

function collectSegments(entities: TweetEntities): Segment[] {
	return [
		...(entities.mentions?.map((entry) => ({
			...entry,
			kind: "mention" as const,
		})) ?? []),
		...(entities.urls?.map((entry) => ({ ...entry, kind: "url" as const })) ??
			[]),
		...(entities.hashtags?.map((entry) => ({
			...entry,
			kind: "hashtag" as const,
		})) ?? []),
	].sort((left, right) => left.start - right.start);
}

export function TweetRichText({
	text,
	entities,
	className = "body-copy",
}: {
	text: string;
	entities: TweetEntities;
	className?: string;
}) {
	const segments = collectSegments(entities);
	let cursor = 0;

	return (
		<p className={className}>
			{segments.map((segment, index) => {
				if (
					segment.start < cursor ||
					segment.end <= segment.start ||
					segment.end > text.length
				) {
					return null;
				}

				const prefix = text.slice(cursor, segment.start);
				cursor = segment.end;

				let node = (
					<Fragment key={`segment-${String(index)}`}>
						{text.slice(segment.start, segment.end)}
					</Fragment>
				);
				if (segment.kind === "mention" && segment.profile) {
					node = (
						<ProfilePreview
							key={`segment-${String(index)}`}
							profile={segment.profile}
						>
							<span className="tweet-mention">@{segment.username}</span>
						</ProfilePreview>
					);
				} else if (segment.kind === "url") {
					node = (
						<a
							key={`segment-${String(index)}`}
							className="tweet-link"
							href={segment.expandedUrl}
							rel="noreferrer"
							target="_blank"
						>
							{segment.displayUrl}
						</a>
					);
				} else if (segment.kind === "hashtag") {
					node = (
						<span className="tweet-hashtag" key={`segment-${String(index)}`}>
							#{segment.tag}
						</span>
					);
				}

				return (
					<Fragment key={`piece-${String(index)}`}>
						{prefix}
						{node}
					</Fragment>
				);
			})}
			{text.slice(cursor)}
		</p>
	);
}
