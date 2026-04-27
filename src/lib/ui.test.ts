import { describe, expect, it } from "vitest";
import { cx, tweetMediaGridClass, tweetMediaTileClass } from "./ui";

describe("ui class helpers", () => {
	it("joins truthy class names only", () => {
		expect(cx("alpha", false, null, undefined, "beta")).toBe("alpha beta");
	});

	it("selects media grid layouts by count", () => {
		expect(tweetMediaGridClass(1)).toContain("grid-cols-1");
		expect(tweetMediaGridClass(3)).toContain("grid-cols-[1.3fr_1fr]");
		expect(tweetMediaGridClass(5)).toContain("tweet-media-grid-4");
		expect(tweetMediaGridClass(5)).toContain("grid-cols-2");
	});

	it("spans the first tile in three-image media grids", () => {
		expect(tweetMediaTileClass(0, 3)).toContain("row-span-2");
		expect(tweetMediaTileClass(1, 3)).not.toContain("row-span-2");
	});
});
