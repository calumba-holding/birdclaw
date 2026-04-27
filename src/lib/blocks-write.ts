import { runModerationAction } from "./actions-transport";
import {
	deleteModerationRow,
	type ModerationActionOptions,
	resolveModerationTarget,
	writeModerationRow,
} from "./moderation-write";

export async function addBlock(
	accountId: string,
	query: string,
	options: ModerationActionOptions = {},
) {
	const { db, resolved, resolvedAccountId, actionQuery } =
		await resolveModerationTarget({
			accountId,
			query,
			selfActionError: "Cannot block the current account",
		});
	const transport = await runModerationAction({
		action: "block",
		query: actionQuery,
		targetUserId: resolved.externalUserId ?? undefined,
		transport: options.transport,
	});

	if (!transport.ok) {
		return {
			ok: false,
			action: "block",
			accountId: resolvedAccountId,
			profile: resolved.profile,
			transport,
		};
	}

	const blockedAt = new Date().toISOString();
	writeModerationRow(
		db,
		"blocks",
		resolvedAccountId,
		resolved.profile.id,
		blockedAt,
	);

	return {
		ok: true,
		action: "block",
		accountId: resolvedAccountId,
		blockedAt,
		profile: resolved.profile,
		transport,
	};
}

export async function recordBlock(accountId: string, query: string) {
	const { db, resolved, resolvedAccountId } = await resolveModerationTarget({
		accountId,
		query,
		selfActionError: "Cannot block the current account",
	});

	const blockedAt = new Date().toISOString();
	writeModerationRow(
		db,
		"blocks",
		resolvedAccountId,
		resolved.profile.id,
		blockedAt,
	);

	return {
		ok: true,
		action: "record-block",
		accountId: resolvedAccountId,
		blockedAt,
		profile: resolved.profile,
	};
}

export async function removeBlock(
	accountId: string,
	query: string,
	options: ModerationActionOptions = {},
) {
	const { db, resolved, resolvedAccountId, actionQuery } =
		await resolveModerationTarget({
			accountId,
			query,
			selfActionError: "Cannot block the current account",
		});
	const transport = await runModerationAction({
		action: "unblock",
		query: actionQuery,
		targetUserId: resolved.externalUserId ?? undefined,
		transport: options.transport,
	});

	if (!transport.ok) {
		return {
			ok: false,
			action: "unblock",
			accountId: resolvedAccountId,
			profile: resolved.profile,
			transport,
		};
	}

	deleteModerationRow(db, "blocks", resolvedAccountId, resolved.profile.id);

	return {
		ok: true,
		action: "unblock",
		accountId: resolvedAccountId,
		profile: resolved.profile,
		transport,
	};
}
