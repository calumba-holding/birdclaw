import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { TimelineCard } from "./TimelineCard";

const item = {
	id: "tweet_1",
	accountId: "acct_primary",
	accountHandle: "@steipete",
	kind: "home" as const,
	text: "Ship the thing",
	createdAt: "2026-03-08T12:00:00.000Z",
	isReplied: false,
	likeCount: 12,
	mediaCount: 1,
	bookmarked: true,
	liked: true,
	author: {
		id: "profile_1",
		handle: "sam",
		displayName: "Sam Altman",
		bio: "bio",
		followersCount: 12345,
		avatarHue: 210,
		createdAt: "2026-03-08T12:00:00.000Z",
	},
};

describe("TimelineCard", () => {
	it("renders tweet metadata and replies", () => {
		const onReply = vi.fn();
		render(<TimelineCard item={item} onReply={onReply} />);

		expect(screen.getByText("Ship the thing")).toBeInTheDocument();
		expect(screen.getByText("@sam")).toBeInTheDocument();
		fireEvent.click(screen.getByRole("button", { name: "Reply" }));
		expect(onReply).toHaveBeenCalledWith("tweet_1");
	});

	it("renders replied and unbookmarked state", () => {
		render(
			<TimelineCard
				item={{
					...item,
					id: "tweet_2",
					isReplied: true,
					bookmarked: false,
					mediaCount: 0,
				}}
				onReply={vi.fn()}
			/>,
		);

		expect(screen.getByText("replied")).toBeInTheDocument();
		expect(screen.getByText("not bookmarked")).toBeInTheDocument();
		expect(screen.getByText("0 media")).toBeInTheDocument();
	});
});
