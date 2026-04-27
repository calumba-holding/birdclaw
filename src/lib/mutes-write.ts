import { runModerationAction } from "./actions-transport";
import {
	deleteModerationRow,
	type ModerationActionOptions,
	resolveModerationTarget,
	writeModerationRow,
} from "./moderation-write";

export async function addMute(
	accountId: string,
	query: string,
	options: ModerationActionOptions = {},
) {
	const { db, resolved, resolvedAccountId, actionQuery } =
		await resolveModerationTarget({
			accountId,
			query,
			selfActionError: "Cannot mute the current account",
		});
	const transport = await runModerationAction({
		action: "mute",
		query: actionQuery,
		targetUserId: resolved.externalUserId ?? undefined,
		transport: options.transport,
	});

	if (!transport.ok) {
		return {
			ok: false,
			action: "mute",
			accountId: resolvedAccountId,
			profile: resolved.profile,
			transport,
		};
	}

	const mutedAt = new Date().toISOString();
	writeModerationRow(
		db,
		"mutes",
		resolvedAccountId,
		resolved.profile.id,
		mutedAt,
	);

	return {
		ok: true,
		action: "mute",
		accountId: resolvedAccountId,
		mutedAt,
		profile: resolved.profile,
		transport,
	};
}

export async function recordMute(accountId: string, query: string) {
	const { db, resolved, resolvedAccountId } = await resolveModerationTarget({
		accountId,
		query,
		selfActionError: "Cannot mute the current account",
	});

	const mutedAt = new Date().toISOString();
	writeModerationRow(
		db,
		"mutes",
		resolvedAccountId,
		resolved.profile.id,
		mutedAt,
	);

	return {
		ok: true,
		action: "record-mute",
		accountId: resolvedAccountId,
		mutedAt,
		profile: resolved.profile,
	};
}

export async function removeMute(
	accountId: string,
	query: string,
	options: ModerationActionOptions = {},
) {
	const { db, resolved, resolvedAccountId, actionQuery } =
		await resolveModerationTarget({
			accountId,
			query,
			selfActionError: "Cannot mute the current account",
		});
	const transport = await runModerationAction({
		action: "unmute",
		query: actionQuery,
		targetUserId: resolved.externalUserId ?? undefined,
		transport: options.transport,
	});

	if (!transport.ok) {
		return {
			ok: false,
			action: "unmute",
			accountId: resolvedAccountId,
			profile: resolved.profile,
			transport,
		};
	}

	deleteModerationRow(db, "mutes", resolvedAccountId, resolved.profile.id);

	return {
		ok: true,
		action: "unmute",
		accountId: resolvedAccountId,
		profile: resolved.profile,
		transport,
	};
}
