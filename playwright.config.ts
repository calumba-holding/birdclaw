import path from "node:path";
import { defineConfig, devices } from "@playwright/test";

const testHome = path.join(process.cwd(), ".playwright-home");

export default defineConfig({
	testDir: "./playwright",
	fullyParallel: false,
	retries: 0,
	workers: 1,
	use: {
		baseURL: "http://127.0.0.1:3000",
		trace: "on-first-retry",
	},
	projects: [
		{
			name: "chromium",
			use: { ...devices["Desktop Chrome"] },
		},
	],
	webServer: {
		command: "fnm exec --using 24.12.0 node ./scripts/start-test-server.mjs",
		url: "http://127.0.0.1:3000",
		reuseExistingServer: false,
		timeout: 120000,
		env: {
			BIRDCLAW_HOME: testHome,
			BIRDCLAW_DISABLE_LIVE_WRITES: "1",
		},
	},
});
