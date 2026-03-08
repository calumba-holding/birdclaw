import type { DmConversationItem, DmMessageItem } from "#/lib/types";

function formatFollowers(value: number) {
	return new Intl.NumberFormat("en", { notation: "compact" }).format(value);
}

function formatTime(value: string) {
	return new Intl.DateTimeFormat("en", {
		hour: "numeric",
		minute: "2-digit",
		month: "short",
		day: "numeric",
	}).format(new Date(value));
}

function initials(name: string) {
	return name
		.split(" ")
		.map((part) => part[0] ?? "")
		.join("")
		.slice(0, 2);
}

function clampBio(value: string, limit = 120) {
	if (value.length <= limit) return value;
	return `${value.slice(0, limit).trimEnd()}...`;
}

function MessageBubble({ message }: { message: DmMessageItem }) {
	return (
		<div
			className={
				message.direction === "outbound"
					? "message-row message-row-outbound"
					: "message-row"
			}
		>
			<div className="message-meta">
				<span>{message.sender.displayName}</span>
				<span>{formatTime(message.createdAt)}</span>
			</div>
			<div
				className={
					message.direction === "outbound"
						? "message-bubble message-bubble-outbound"
						: "message-bubble"
				}
			>
				{message.text}
			</div>
		</div>
	);
}

export function DmWorkspace({
	conversations,
	selectedConversation,
	selectedMessages,
	onSelectConversation,
	replyDraft,
	onReplyDraftChange,
	onReplySend,
}: {
	conversations: DmConversationItem[];
	selectedConversation: DmConversationItem | null;
	selectedMessages: DmMessageItem[];
	onSelectConversation: (conversationId: string) => void;
	replyDraft: string;
	onReplyDraftChange: (value: string) => void;
	onReplySend: (conversationId: string) => void;
}) {
	const participant = selectedConversation?.participant ?? null;
	const heroLabel = participant
		? `${formatFollowers(participant.followersCount)} followers · score ${selectedConversation?.influenceScore ?? 0} · ${selectedConversation?.influenceLabel}`
		: "No conversation selected";

	return (
		<section className="dm-grid">
			<aside className="dm-list">
				{conversations.map((conversation) => {
					const active = conversation.id === selectedConversation?.id;
					return (
						<button
							key={conversation.id}
							className={
								active ? "dm-list-item dm-list-item-active" : "dm-list-item"
							}
							onClick={() => onSelectConversation(conversation.id)}
							type="button"
						>
							<div
								className="avatar-chip"
								style={{
									backgroundColor: `hsl(${conversation.participant.avatarHue} 72% 50%)`,
								}}
							>
								{initials(conversation.participant.displayName)}
							</div>
							<div className="dm-list-copy">
								<div className="identity-row">
									<strong>{conversation.participant.displayName}</strong>
									<span>@{conversation.participant.handle}</span>
								</div>
								<p className="dm-bio-preview">
									{clampBio(conversation.participant.bio, 84)}
								</p>
								<p>{conversation.lastMessagePreview}</p>
							</div>
							<div className="meta-stack">
								<span
									className={
										conversation.needsReply
											? "pill pill-alert"
											: "pill pill-soft"
									}
								>
									{conversation.needsReply ? "needs reply" : "clear"}
								</span>
								<span className="pill pill-soft">
									{conversation.influenceScore} · {conversation.influenceLabel}
								</span>
								<span className="timestamp">
									{formatTime(conversation.lastMessageAt)}
								</span>
							</div>
						</button>
					);
				})}
			</aside>

			<div className="thread-shell">
				{selectedConversation ? (
					<>
						<header className="thread-header">
							<div>
								<p className="eyebrow">direct messages</p>
								<h2>{selectedConversation.participant.displayName}</h2>
								<p className="thread-subtitle">{heroLabel}</p>
								<p className="thread-bio">{participant?.bio}</p>
							</div>
							<button
								className="action-button"
								onClick={() => onReplySend(selectedConversation.id)}
								type="button"
							>
								Reply
							</button>
						</header>
						<div className="message-stack">
							{selectedMessages.map((message) => (
								<MessageBubble key={message.id} message={message} />
							))}
						</div>
						<div className="composer-shell">
							<textarea
								className="composer-input"
								onChange={(event) => onReplyDraftChange(event.target.value)}
								placeholder={`Reply to @${selectedConversation.participant.handle}`}
								rows={4}
								value={replyDraft}
							/>
							<div className="composer-bar">
								<span className="timestamp">
									{selectedConversation.needsReply
										? "Reply still owed"
										: "Thread clear"}
								</span>
								<button
									className="action-button"
									disabled={!replyDraft.trim()}
									onClick={() => onReplySend(selectedConversation.id)}
									type="button"
								>
									Send reply
								</button>
							</div>
						</div>
					</>
				) : (
					<div className="empty-state">No DM selected.</div>
				)}
			</div>

			<aside className="context-rail">
				{participant ? (
					<>
						<p className="eyebrow">sender context</p>
						<div
							className="avatar-chip avatar-chip-large"
							style={{
								backgroundColor: `hsl(${participant.avatarHue} 72% 50%)`,
							}}
						>
							{initials(participant.displayName)}
						</div>
						<h3>{participant.displayName}</h3>
						<p className="context-handle">@{participant.handle}</p>
						<p className="context-bio">{participant.bio}</p>
						<dl className="context-stats">
							<div>
								<dt>Followers</dt>
								<dd>{formatFollowers(participant.followersCount)}</dd>
							</div>
							<div>
								<dt>Influence</dt>
								<dd>
									{selectedConversation?.influenceScore} ·{" "}
									{selectedConversation?.influenceLabel}
								</dd>
							</div>
							<div>
								<dt>Reply state</dt>
								<dd>
									{selectedConversation?.needsReply ? "Needs reply" : "Replied"}
								</dd>
							</div>
							<div>
								<dt>Last message</dt>
								<dd>
									{formatTime(
										selectedConversation?.lastMessageAt ??
											participant.createdAt,
									)}
								</dd>
							</div>
						</dl>
					</>
				) : (
					<div className="empty-state">
						Select a conversation to see the sender bio.
					</div>
				)}
			</aside>
		</section>
	);
}
