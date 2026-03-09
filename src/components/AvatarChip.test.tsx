import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AvatarChip } from "./AvatarChip";

describe("AvatarChip", () => {
	it("renders initials, hue, and large variant", () => {
		render(<AvatarChip hue={210} name="Sam Altman" size="large" />);

		const chip = screen.getByText("SA");
		expect(chip).toHaveClass("avatar-chip-large");
		expect(chip).toHaveStyle({ backgroundColor: "rgb(36, 128, 219)" });
	});
});
