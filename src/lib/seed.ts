import type Database from "better-sqlite3";

const now = new Date("2026-03-08T12:00:00.000Z");

function isoMinutesAgo(minutes: number) {
	return new Date(now.getTime() - minutes * 60_000).toISOString();
}

export function seedDemoData(db: Database.Database) {
	const accountCount = db
		.prepare("select count(*) as count from accounts")
		.get() as { count: number };

	if (accountCount.count > 0) {
		return;
	}

	const insertAccount = db.prepare(`
    insert into accounts (id, name, handle, transport, is_default, created_at)
    values (@id, @name, @handle, @transport, @isDefault, @createdAt)
  `);

	const insertProfile = db.prepare(`
    insert into profiles (id, handle, display_name, bio, followers_count, avatar_hue, created_at)
    values (@id, @handle, @displayName, @bio, @followersCount, @avatarHue, @createdAt)
  `);

	const insertTweet = db.prepare(`
    insert into tweets (
      id, account_id, author_profile_id, kind, text, created_at, is_replied,
      reply_to_id, like_count, media_count, bookmarked, liked
    ) values (
      @id, @accountId, @authorProfileId, @kind, @text, @createdAt, @isReplied,
      @replyToId, @likeCount, @mediaCount, @bookmarked, @liked
    )
  `);

	const insertConversation = db.prepare(`
    insert into dm_conversations (
      id, account_id, participant_profile_id, title, last_message_at, unread_count, needs_reply
    ) values (
      @id, @accountId, @participantProfileId, @title, @lastMessageAt, @unreadCount, @needsReply
    )
  `);

	const insertMessage = db.prepare(`
    insert into dm_messages (
      id, conversation_id, sender_profile_id, text, created_at, direction, is_replied, media_count
    ) values (
      @id, @conversationId, @senderProfileId, @text, @createdAt, @direction, @isReplied, @mediaCount
    )
  `);

	const insertTweetsFts = db.prepare(
		"insert into tweets_fts (tweet_id, text) values (?, ?)",
	);
	const insertDmFts = db.prepare(
		"insert into dm_fts (message_id, text) values (?, ?)",
	);

	const accounts = [
		{
			id: "acct_primary",
			name: "Peter",
			handle: "@steipete",
			transport: "xurl",
			isDefault: 1,
			createdAt: now.toISOString(),
		},
		{
			id: "acct_studio",
			name: "Studio",
			handle: "@birdclaw_lab",
			transport: "xurl",
			isDefault: 0,
			createdAt: now.toISOString(),
		},
	];

	const profiles = [
		{
			id: "profile_me",
			handle: "steipete",
			displayName: "Peter Steinberger",
			bio: "Builds native software, tooling, and sharp little systems.",
			followersCount: 21450,
			avatarHue: 18,
			createdAt: now.toISOString(),
		},
		{
			id: "profile_sam",
			handle: "sam",
			displayName: "Sam Altman",
			bio: "Working on AGI, energy, chips, and shipping the hard parts.",
			followersCount: 3180000,
			avatarHue: 210,
			createdAt: now.toISOString(),
		},
		{
			id: "profile_des",
			handle: "destraynor",
			displayName: "Des Traynor",
			bio: "Intercom co-founder. Product, writing, and oddly specific opinions.",
			followersCount: 178000,
			avatarHue: 144,
			createdAt: now.toISOString(),
		},
		{
			id: "profile_amelia",
			handle: "amelia",
			displayName: "Amelia N",
			bio: "Design systems, prototypes, and good typography over noise.",
			followersCount: 4200,
			avatarHue: 320,
			createdAt: now.toISOString(),
		},
		{
			id: "profile_ava",
			handle: "avawires",
			displayName: "Ava Wires",
			bio: "Reports on infrastructure, AI policy, and the business of software.",
			followersCount: 632000,
			avatarHue: 262,
			createdAt: now.toISOString(),
		},
		{
			id: "profile_noah",
			handle: "noahbuilds",
			displayName: "Noah Builds",
			bio: "Bootstrapped indie apps. Pragmatic, fast, allergic to dashboards.",
			followersCount: 12600,
			avatarHue: 74,
			createdAt: now.toISOString(),
		},
	];

	const tweets = [
		{
			id: "tweet_001",
			accountId: "acct_primary",
			authorProfileId: "profile_sam",
			kind: "home",
			text: "We need more software that defaults to local-first, legible state, and repairable failure modes.",
			createdAt: isoMinutesAgo(18),
			isReplied: 0,
			replyToId: null,
			likeCount: 1240,
			mediaCount: 0,
			bookmarked: 1,
			liked: 1,
		},
		{
			id: "tweet_002",
			accountId: "acct_primary",
			authorProfileId: "profile_des",
			kind: "home",
			text: "The best product teams spend more time pruning scope than adding it.",
			createdAt: isoMinutesAgo(42),
			isReplied: 1,
			replyToId: null,
			likeCount: 382,
			mediaCount: 0,
			bookmarked: 0,
			liked: 1,
		},
		{
			id: "tweet_003",
			accountId: "acct_primary",
			authorProfileId: "profile_ava",
			kind: "home",
			text: "New developer-platform pricing survey out today. Early signal: teams want fewer layers, not more.",
			createdAt: isoMinutesAgo(91),
			isReplied: 0,
			replyToId: null,
			likeCount: 128,
			mediaCount: 1,
			bookmarked: 0,
			liked: 0,
		},
		{
			id: "tweet_004",
			accountId: "acct_primary",
			authorProfileId: "profile_amelia",
			kind: "mention",
			text: "@steipete curious how you decide when a local tool deserves a real sync engine versus manual import/export.",
			createdAt: isoMinutesAgo(12),
			isReplied: 0,
			replyToId: null,
			likeCount: 14,
			mediaCount: 0,
			bookmarked: 0,
			liked: 0,
		},
		{
			id: "tweet_005",
			accountId: "acct_primary",
			authorProfileId: "profile_noah",
			kind: "mention",
			text: "@steipete your archive-first note resonated. I still want a path for people with zero clean export data.",
			createdAt: isoMinutesAgo(54),
			isReplied: 1,
			replyToId: null,
			likeCount: 8,
			mediaCount: 0,
			bookmarked: 0,
			liked: 0,
		},
		{
			id: "tweet_006",
			accountId: "acct_studio",
			authorProfileId: "profile_sam",
			kind: "home",
			text: "Agents need retrieval surfaces with small, stable contracts. Big blobs are not a strategy.",
			createdAt: isoMinutesAgo(77),
			isReplied: 0,
			replyToId: null,
			likeCount: 912,
			mediaCount: 0,
			bookmarked: 1,
			liked: 1,
		},
	];

	const conversations = [
		{
			id: "dm_001",
			accountId: "acct_primary",
			participantProfileId: "profile_sam",
			title: "Sam Altman",
			lastMessageAt: isoMinutesAgo(8),
			unreadCount: 1,
			needsReply: 1,
		},
		{
			id: "dm_002",
			accountId: "acct_primary",
			participantProfileId: "profile_des",
			title: "Des Traynor",
			lastMessageAt: isoMinutesAgo(65),
			unreadCount: 0,
			needsReply: 0,
		},
		{
			id: "dm_003",
			accountId: "acct_primary",
			participantProfileId: "profile_amelia",
			title: "Amelia N",
			lastMessageAt: isoMinutesAgo(25),
			unreadCount: 2,
			needsReply: 1,
		},
		{
			id: "dm_004",
			accountId: "acct_studio",
			participantProfileId: "profile_ava",
			title: "Ava Wires",
			lastMessageAt: isoMinutesAgo(130),
			unreadCount: 0,
			needsReply: 0,
		},
	];

	const messages = [
		{
			id: "msg_001",
			conversationId: "dm_001",
			senderProfileId: "profile_sam",
			text: "Can you send the local-first sync sketch? The inbox angle is strong.",
			createdAt: isoMinutesAgo(8),
			direction: "inbound",
			isReplied: 0,
			mediaCount: 0,
		},
		{
			id: "msg_002",
			conversationId: "dm_001",
			senderProfileId: "profile_me",
			text: "Yep. I am tightening the transport boundary first, then I will send the schema.",
			createdAt: isoMinutesAgo(27),
			direction: "outbound",
			isReplied: 1,
			mediaCount: 0,
		},
		{
			id: "msg_003",
			conversationId: "dm_002",
			senderProfileId: "profile_des",
			text: "The minimal UI direction feels right. People should read, not manage a cockpit.",
			createdAt: isoMinutesAgo(65),
			direction: "inbound",
			isReplied: 1,
			mediaCount: 0,
		},
		{
			id: "msg_004",
			conversationId: "dm_002",
			senderProfileId: "profile_me",
			text: "Exactly. Dense signal, quiet chrome, clear action lanes.",
			createdAt: isoMinutesAgo(58),
			direction: "outbound",
			isReplied: 1,
			mediaCount: 0,
		},
		{
			id: "msg_005",
			conversationId: "dm_003",
			senderProfileId: "profile_amelia",
			text: "I mocked a cleaner split-pane DM layout. Want me to send it over?",
			createdAt: isoMinutesAgo(25),
			direction: "inbound",
			isReplied: 0,
			mediaCount: 1,
		},
		{
			id: "msg_006",
			conversationId: "dm_003",
			senderProfileId: "profile_amelia",
			text: "Also added a tiny context rail for bios and follower counts.",
			createdAt: isoMinutesAgo(22),
			direction: "inbound",
			isReplied: 0,
			mediaCount: 0,
		},
		{
			id: "msg_007",
			conversationId: "dm_004",
			senderProfileId: "profile_ava",
			text: "If you have a public draft later, I would love to quote the agent-query angle.",
			createdAt: isoMinutesAgo(130),
			direction: "inbound",
			isReplied: 1,
			mediaCount: 0,
		},
		{
			id: "msg_008",
			conversationId: "dm_004",
			senderProfileId: "profile_me",
			text: "Will do. I want the filters and local storage story to be credible first.",
			createdAt: isoMinutesAgo(124),
			direction: "outbound",
			isReplied: 1,
			mediaCount: 0,
		},
	];

	const transaction = db.transaction(() => {
		for (const account of accounts) {
			insertAccount.run(account);
		}

		for (const profile of profiles) {
			insertProfile.run(profile);
		}

		for (const tweet of tweets) {
			insertTweet.run(tweet);
			insertTweetsFts.run(tweet.id, tweet.text);
		}

		for (const conversation of conversations) {
			insertConversation.run(conversation);
		}

		for (const message of messages) {
			insertMessage.run(message);
			insertDmFts.run(message.id, message.text);
		}
	});

	transaction();
}
