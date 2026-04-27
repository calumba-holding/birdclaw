import { describe, expect, it } from "vitest";
import {
	formatCompactNumber,
	formatShortTimestamp,
	getInitials,
} from "./present";

describe("present helpers", () => {
	it("formats compact counts, short timestamps, and initials", () => {
		expect(formatCompactNumber(12_300)).toBe("12K");
		expect(formatShortTimestamp("2026-03-08T12:00:00.000Z")).toBe(
			"Mar 8, 12:00 PM",
		);
		expect(getInitials("Sam Altman")).toBe("SA");
		expect(getInitials("A")).toBe("A");
		expect(getInitials(" Sam")).toBe("S");
	});
});
