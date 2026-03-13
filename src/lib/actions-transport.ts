import {
	blockUserViaBird,
	muteUserViaBird,
	readBirdStatusViaBird,
	unblockUserViaBird,
	unmuteUserViaBird,
} from "./bird-actions";
import { type ActionsTransport, resolveActionsTransport } from "./config";
import type {
	ModerationAction,
	ModerationActionTransportResult,
} from "./types";
import {
	blockUserViaXurl,
	lookupAuthenticatedUser,
	muteUserViaXurl,
	unblockUserViaXurl,
	unmuteUserViaXurl,
} from "./xurl";

export type ActionTransportResult = ModerationActionTransportResult;

interface RunActionParams {
	action: ModerationAction;
	query: string;
	targetUserId?: string;
	transport?: string;
}

function normalizeFailure(transport: "bird" | "xurl", output: string) {
	return `${transport}: ${output}`;
}

async function runBirdAction(
	action: ModerationAction,
	query: string,
): Promise<ActionTransportResult> {
	const result =
		action === "block"
			? await blockUserViaBird(query)
			: action === "unblock"
				? await unblockUserViaBird(query)
				: action === "mute"
					? await muteUserViaBird(query)
					: await unmuteUserViaBird(query);

	return {
		...result,
		transport: "bird",
	};
}

function getVerifyExpectation(action: ModerationAction) {
	return action === "block" || action === "unblock"
		? {
				field: "blocking" as const,
				expected: action === "block",
			}
		: {
				field: "muting" as const,
				expected: action === "mute",
			};
}

async function runXurlAction(
	action: ModerationAction,
	query: string,
	targetUserId?: string,
): Promise<ActionTransportResult> {
	if (!targetUserId) {
		return {
			ok: false,
			output: "missing target user id for xurl transport",
			transport: "xurl",
		};
	}

	const sourceUser = await lookupAuthenticatedUser();
	const sourceUserId =
		sourceUser && typeof sourceUser.id === "string" ? sourceUser.id : "";
	if (!sourceUserId) {
		return {
			ok: false,
			output: "xurl authenticated user unavailable",
			transport: "xurl",
		};
	}

	const result =
		action === "block"
			? await blockUserViaXurl(sourceUserId, targetUserId)
			: action === "unblock"
				? await unblockUserViaXurl(sourceUserId, targetUserId)
				: action === "mute"
					? await muteUserViaXurl(sourceUserId, targetUserId)
					: await unmuteUserViaXurl(sourceUserId, targetUserId);

	if (!result.ok) {
		return {
			...result,
			transport: "xurl",
		};
	}

	const status = await readBirdStatusViaBird(query);
	const { field: verifyField, expected: expectedValue } =
		getVerifyExpectation(action);
	const actualValue =
		status && typeof status[verifyField] === "boolean"
			? Boolean(status[verifyField])
			: null;

	if (actualValue === null) {
		return {
			ok: false,
			output: `${result.output}\nxurl verify unavailable from bird status`,
			transport: "xurl",
		};
	}

	if (actualValue !== expectedValue) {
		return {
			ok: false,
			output: `${result.output}\nxurl verify mismatch ${verifyField}=${String(actualValue)}`,
			transport: "xurl",
		};
	}

	return {
		ok: true,
		output: `${result.output}\nverified ${verifyField}=${String(actualValue)}`,
		transport: "xurl",
	};
}

export async function runModerationAction({
	action,
	query,
	targetUserId,
	transport,
}: RunActionParams): Promise<ActionTransportResult> {
	const requestedTransport = resolveActionsTransport(transport);
	if (requestedTransport === "bird") {
		return runBirdAction(action, query);
	}
	if (requestedTransport === "xurl") {
		return runXurlAction(action, query, targetUserId);
	}

	const birdResult = await runBirdAction(action, query);
	if (birdResult.ok) {
		return birdResult;
	}

	const xurlResult = await runXurlAction(action, query, targetUserId);
	if (xurlResult.ok) {
		return {
			...xurlResult,
			output: `${xurlResult.output}\nfalling back after ${normalizeFailure("bird", birdResult.output)}`,
		};
	}

	return {
		ok: false,
		output: [
			normalizeFailure("bird", birdResult.output),
			normalizeFailure("xurl", xurlResult.output),
		].join("\n"),
		transport: xurlResult.transport,
	};
}

export type { ActionsTransport };
