import { rmSync } from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";

const cwd = process.cwd();
const home = process.env.BIRDCLAW_HOME || path.join(cwd, ".playwright-home");

rmSync(home, { recursive: true, force: true });

const child = spawn(
	process.platform === "win32" ? "pnpm.cmd" : "pnpm",
	["exec", "vite", "dev", "--port", "3000", "--host", "127.0.0.1"],
	{
		cwd,
		stdio: "inherit",
		env: {
			...process.env,
			BIRDCLAW_HOME: home,
		},
	},
);

child.on("exit", (code) => {
	process.exit(code ?? 0);
});
