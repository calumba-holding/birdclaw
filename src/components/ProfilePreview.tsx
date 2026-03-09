import type { ReactNode } from "react";
import type { ProfileRecord } from "#/lib/types";

function formatFollowers(value: number) {
	return new Intl.NumberFormat("en", { notation: "compact" }).format(value);
}

export function ProfilePreview({
	profile,
	children,
	className = "",
}: {
	profile: ProfileRecord;
	children: ReactNode;
	className?: string;
}) {
	return (
		<span className={`profile-preview ${className}`.trim()}>
			<a
				className="profile-preview-trigger"
				href={`https://x.com/${profile.handle}`}
				rel="noreferrer"
				target="_blank"
			>
				{children}
			</a>
			<span className="profile-preview-card">
				<span className="profile-preview-header">
					<span
						className="avatar-chip"
						style={{ backgroundColor: `hsl(${profile.avatarHue} 72% 50%)` }}
					>
						{profile.displayName
							.split(" ")
							.map((part) => part[0] ?? "")
							.join("")
							.slice(0, 2)}
					</span>
					<span>
						<strong>{profile.displayName}</strong>
						<span className="profile-preview-handle">@{profile.handle}</span>
					</span>
				</span>
				<span className="profile-preview-bio">{profile.bio}</span>
				<span className="profile-preview-meta">
					{formatFollowers(profile.followersCount)} followers
				</span>
			</span>
		</span>
	);
}
