import {
	cleanup,
	fireEvent,
	render,
	screen,
	waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ThemeProvider } from "#/lib/theme";
import { ThemeSlider } from "./ThemeSlider";

function installMatchMedia(matches = false) {
	Object.defineProperty(window, "matchMedia", {
		writable: true,
		value: vi.fn().mockImplementation(() => ({
			matches,
			addEventListener: vi.fn(),
			removeEventListener: vi.fn(),
			addListener: vi.fn(),
			removeListener: vi.fn(),
		})),
	});
}

describe("ThemeSlider", () => {
	beforeEach(() => {
		window.localStorage.clear();
		document.documentElement.dataset.theme = "light";
		document.documentElement.dataset.themePreference = "system";
		installMatchMedia(false);
	});

	afterEach(() => {
		cleanup();
		delete (
			document as unknown as {
				startViewTransition?: unknown;
			}
		).startViewTransition;
		vi.restoreAllMocks();
	});

	it("switches to dark mode and persists the choice", async () => {
		render(
			<ThemeProvider>
				<ThemeSlider />
			</ThemeProvider>,
		);

		const darkButton = await screen.findByRole("button", {
			name: "Dark theme",
		});
		await waitFor(() => {
			expect(darkButton).toBeEnabled();
		});
		fireEvent.click(darkButton);

		await waitFor(() => {
			expect(document.documentElement.dataset.theme).toBe("dark");
		});
		expect(document.documentElement.dataset.themePreference).toBe("dark");
		expect(window.localStorage.getItem("birdclaw-theme")).toBe("dark");
	});

	it("keeps the active theme when clicked", async () => {
		const startViewTransition = vi.fn();
		(
			document as unknown as {
				startViewTransition?: typeof startViewTransition;
			}
		).startViewTransition = startViewTransition;

		render(
			<ThemeProvider>
				<ThemeSlider />
			</ThemeProvider>,
		);

		const systemButton = await screen.findByRole("button", {
			name: "System default",
		});
		await waitFor(() => {
			expect(systemButton).toBeEnabled();
		});
		fireEvent.click(systemButton);

		expect(document.documentElement.dataset.themePreference).toBe("system");
		expect(startViewTransition).not.toHaveBeenCalled();
	});
});
