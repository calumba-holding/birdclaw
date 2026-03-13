import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { getBirdCommand } from "./config";

const execFileAsync = promisify(execFile);

function liveWritesDisabled() {
	return process.env.BIRDCLAW_DISABLE_LIVE_WRITES === "1";
}

function stripAnsi(value: string) {
	// biome-ignore lint/complexity/useRegexLiterals: ANSI escape parsing needs a constructor to avoid control-char lint failures.
	return value.replace(new RegExp("\\u001b\\[[0-9;]*m", "g"), "");
}

function formatExecError(error: unknown, fallback: string) {
	if (!(error instanceof Error)) {
		return fallback;
	}

	const parts = [error.message];
	if (
		"stdout" in error &&
		typeof error.stdout === "string" &&
		error.stdout.trim().length > 0
	) {
		parts.push(stripAnsi(error.stdout).trim());
	}
	if (
		"stderr" in error &&
		typeof error.stderr === "string" &&
		error.stderr.trim().length > 0
	) {
		parts.push(stripAnsi(error.stderr).trim());
	}

	return parts.join("\n");
}

function normalizeOutput(stdout?: string, stderr?: string) {
	return stripAnsi(stdout || stderr || "ok").trim();
}

async function runBirdCommand(args: string[]) {
	const birdCommand = getBirdCommand();
	return execFileAsync(birdCommand, args);
}

export async function readBirdStatusViaBird(query: string) {
	try {
		const { stdout } = await runBirdCommand(["status", query, "--json"]);
		const payload = JSON.parse(stdout) as Record<string, unknown>;
		return payload;
	} catch {
		return null;
	}
}

async function runVerifiedBirdMutation({
	action,
	query,
	verifyField,
	expectedValue,
}: {
	action: "block" | "unblock" | "mute" | "unmute";
	query: string;
	verifyField: "blocking" | "muting";
	expectedValue: boolean;
}) {
	if (liveWritesDisabled()) {
		return { ok: true, output: "live writes disabled" };
	}

	let baseOutput = "";
	try {
		const { stdout, stderr } = await runBirdCommand([action, query]);
		baseOutput = normalizeOutput(stdout, stderr);
	} catch (error) {
		return {
			ok: false,
			output: formatExecError(error, `bird ${action} failed`),
		};
	}

	const status = await readBirdStatusViaBird(query);
	if (!status || typeof status[verifyField] !== "boolean") {
		return {
			ok: false,
			output: `${baseOutput}; bird status verify unavailable`,
		};
	}

	const actualValue = Boolean(status[verifyField]);
	if (actualValue !== expectedValue) {
		return {
			ok: false,
			output: `${baseOutput}; bird status verify ${verifyField}=${String(actualValue)}`,
		};
	}

	return {
		ok: true,
		output: `${baseOutput}; verified ${verifyField}=${String(actualValue)}`,
	};
}

export async function blockUserViaBird(query: string) {
	return runVerifiedBirdMutation({
		action: "block",
		query,
		verifyField: "blocking",
		expectedValue: true,
	});
}

export async function unblockUserViaBird(query: string) {
	return runVerifiedBirdMutation({
		action: "unblock",
		query,
		verifyField: "blocking",
		expectedValue: false,
	});
}

export async function muteUserViaBird(query: string) {
	return runVerifiedBirdMutation({
		action: "mute",
		query,
		verifyField: "muting",
		expectedValue: true,
	});
}

export async function unmuteUserViaBird(query: string) {
	return runVerifiedBirdMutation({
		action: "unmute",
		query,
		verifyField: "muting",
		expectedValue: false,
	});
}
