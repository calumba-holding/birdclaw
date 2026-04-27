import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { AvatarChip } from "#/components/AvatarChip";
import { formatCompactNumber } from "#/lib/present";
import type {
	BlockItem,
	BlockListResponse,
	BlockSearchItem,
	QueryEnvelope,
} from "#/lib/types";
import {
	actionButtonClass,
	cardHeaderClass,
	contentCardClass,
	cx,
	errorCopyClass,
	eyebrowClass,
	heroControlsBlocksClass,
	heroControlsClass,
	heroCopyClass,
	heroShellClass,
	heroTitleClass,
	identityBlockClass,
	metaRowClass,
	mutedDotClass,
	pageWrapClass,
	stackGridClass,
	textFieldClass,
	textFieldShortClass,
	textFieldWideClass,
	timestampClass,
} from "#/lib/ui";

export const Route = createFileRoute("/blocks")({
	component: BlocksRoute,
});

function BlocksRoute() {
	const [meta, setMeta] = useState<QueryEnvelope | null>(null);
	const [accountId, setAccountId] = useState<string>("acct_primary");
	const [search, setSearch] = useState("");
	const [items, setItems] = useState<BlockItem[]>([]);
	const [matches, setMatches] = useState<BlockSearchItem[]>([]);
	const [refreshTick, setRefreshTick] = useState(0);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [isSyncing, setIsSyncing] = useState(false);
	const [message, setMessage] = useState("");
	const [error, setError] = useState("");
	const hasAccountId = accountId.trim().length > 0;
	const isReady = Boolean(meta);

	useEffect(() => {
		const controller = new AbortController();

		fetch("/api/status", { signal: controller.signal })
			.then((response) => response.json())
			.then((data: QueryEnvelope) => {
				setMeta(data);
				setAccountId(data.accounts[0]?.id ?? "acct_primary");
				setError("");
			})
			.catch((error: unknown) => {
				if (error instanceof DOMException && error.name === "AbortError") {
					return;
				}
				setError(
					error instanceof Error
						? error.message
						: "Unable to load blocklist status",
				);
			});

		return () => {
			controller.abort();
		};
	}, []);

	useEffect(() => {
		const controller = new AbortController();
		const params = new URLSearchParams({
			account: accountId,
			limit: "12",
			refresh: String(refreshTick),
		});
		if (search.trim()) {
			params.set("search", search.trim());
		}

		fetch(`/api/blocks?${params.toString()}`, { signal: controller.signal })
			.then((response) => response.json())
			.then((data: BlockListResponse) => {
				setItems(data.items);
				setMatches(data.matches);
				setError("");
			})
			.catch((error: unknown) => {
				if (error instanceof DOMException && error.name === "AbortError") {
					return;
				}
				setError(
					error instanceof Error ? error.message : "Unable to load blocklist",
				);
			});

		return () => {
			controller.abort();
		};
	}, [accountId, refreshTick, search]);

	useEffect(() => {
		if (!hasAccountId) {
			return;
		}

		const controller = new AbortController();
		setIsSyncing(true);

		fetch("/api/action", {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({
				kind: "syncBlocks",
				accountId,
			}),
			signal: controller.signal,
		})
			.then((response) => response.json())
			.then(
				(data: {
					ok?: boolean;
					synced?: boolean;
					syncedCount?: number;
					transport?: { ok?: boolean; output?: string };
				}) => {
					if (data.ok === false) {
						setError(data.transport?.output ?? "Block sync failed");
						return;
					}
					setRefreshTick((value) => value + 1);
					if (data.transport?.output?.includes("disabled")) {
						return;
					}
					setMessage(
						data.transport?.output ??
							`Synced ${data.syncedCount ?? 0} remote blocks`,
					);
				},
			)
			.catch((error: unknown) => {
				if (error instanceof DOMException && error.name === "AbortError") {
					return;
				}
				setError(error instanceof Error ? error.message : "Block sync failed");
			})
			.finally(() => setIsSyncing(false));

		return () => {
			controller.abort();
		};
	}, [accountId, hasAccountId]);

	const subtitle = useMemo(() => {
		if (!meta) {
			return items.length > 0
				? `${items.length} blocked profiles in view · loading transport status...`
				: "Loading local blocklist...";
		}
		if (isSyncing)
			return `Syncing remote blocklist · ${meta.transport.statusText}`;
		return `${items.length} blocked profiles in view · ${meta.transport.statusText}`;
	}, [isSyncing, items.length, meta]);

	async function submit(
		kind: "blockProfile" | "unblockProfile",
		query: string,
	) {
		const normalized = query.trim();
		if (!normalized) return;

		setIsSubmitting(true);
		setError("");
		setMessage("");

		try {
			const response = await fetch("/api/action", {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({
					kind,
					accountId,
					query: normalized,
				}),
			});
			const data = (await response.json()) as {
				profile?: { handle?: string };
				transport?: { output?: string };
			};

			setMessage(
				`${kind === "blockProfile" ? "Blocked" : "Unblocked"} @${
					data.profile?.handle ?? normalized.replace(/^@/, "")
				} · ${data.transport?.output ?? "local"}`,
			);
			setRefreshTick((value) => value + 1);
		} catch (submitError) {
			setError(
				submitError instanceof Error
					? submitError.message
					: "Blocklist action failed",
			);
		} finally {
			setIsSubmitting(false);
		}
	}

	return (
		<main className={pageWrapClass}>
			<section className={heroShellClass}>
				<div>
					<p className={eyebrowClass}>blocks</p>
					<h2 className={heroTitleClass}>
						Maintain a clean blocklist locally.
					</h2>
					<p className={heroCopyClass}>{subtitle}</p>
				</div>
				<div className={cx(heroControlsClass, heroControlsBlocksClass)}>
					<select
						className={cx(textFieldClass, textFieldShortClass)}
						disabled={!isReady}
						onChange={(event) => setAccountId(event.target.value)}
						value={accountId}
					>
						{meta?.accounts.map((account) => (
							<option key={account.id} value={account.id}>
								{account.handle}
							</option>
						))}
					</select>
					<input
						className={cx(textFieldClass, textFieldWideClass)}
						disabled={!hasAccountId}
						onChange={(event) => setSearch(event.target.value)}
						placeholder="Handle, name, bio, or Twitter URL"
						value={search}
					/>
					<button
						className={actionButtonClass}
						disabled={!hasAccountId || isSubmitting || !search.trim()}
						onClick={() => void submit("blockProfile", search)}
						type="button"
					>
						{isSubmitting ? "Working..." : "Block"}
					</button>
				</div>
			</section>

			{message ? <p className={timestampClass}>{message}</p> : null}
			{error ? <p className={errorCopyClass}>{error}</p> : null}

			{matches.length > 0 ? (
				<section className={stackGridClass}>
					{matches.map((match) => (
						<article
							className={cx(contentCardClass, "block-card")}
							key={match.profile.id}
						>
							<div className={cardHeaderClass}>
								<div className={identityBlockClass}>
									<AvatarChip
										avatarUrl={match.profile.avatarUrl}
										hue={match.profile.avatarHue}
										name={match.profile.displayName}
										profileId={match.profile.id}
									/>
									<div>
										<strong>{match.profile.displayName}</strong>
										<div className={metaRowClass}>
											<span>@{match.profile.handle}</span>
											<span className={mutedDotClass} />
											<span>
												{formatCompactNumber(match.profile.followersCount)}{" "}
												followers
											</span>
										</div>
									</div>
								</div>
								<button
									className={actionButtonClass}
									onClick={() =>
										void submit(
											match.isBlocked ? "unblockProfile" : "blockProfile",
											match.profile.id,
										)
									}
									type="button"
								>
									{match.isBlocked ? "Unblock" : "Block"}
								</button>
							</div>
							<p className="mt-2.5">{match.profile.bio}</p>
						</article>
					))}
				</section>
			) : null}

			<section className={stackGridClass}>
				{items.map((item) => (
					<article
						className={cx(contentCardClass, "block-card")}
						key={item.accountId + item.profile.id}
					>
						<div className={cardHeaderClass}>
							<div className={identityBlockClass}>
								<AvatarChip
									avatarUrl={item.profile.avatarUrl}
									hue={item.profile.avatarHue}
									name={item.profile.displayName}
									profileId={item.profile.id}
								/>
								<div>
									<strong>{item.profile.displayName}</strong>
									<div className={metaRowClass}>
										<span>@{item.profile.handle}</span>
										<span className={mutedDotClass} />
										<span>{item.accountHandle}</span>
										<span className={mutedDotClass} />
										<span>
											{formatCompactNumber(item.profile.followersCount)}{" "}
											followers
										</span>
									</div>
								</div>
							</div>
							<button
								className={actionButtonClass}
								onClick={() => void submit("unblockProfile", item.profile.id)}
								type="button"
							>
								Unblock
							</button>
						</div>
						<p className="mt-2.5">{item.profile.bio}</p>
						<p className={timestampClass}>
							Blocked {new Date(item.blockedAt).toLocaleString()} ·{" "}
							{item.source}
						</p>
					</article>
				))}
			</section>
		</main>
	);
}
