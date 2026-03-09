import type { ReactNode } from "react";
import { formatCompactNumber } from "#/lib/present";
import type { ProfileRecord } from "#/lib/types";
import { AvatarChip } from "./AvatarChip";

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
					<AvatarChip hue={profile.avatarHue} name={profile.displayName} />
					<span>
						<strong>{profile.displayName}</strong>
						<span className="profile-preview-handle">@{profile.handle}</span>
					</span>
				</span>
				<span className="profile-preview-bio">{profile.bio}</span>
				<span className="profile-preview-meta">
					{formatCompactNumber(profile.followersCount)} followers
				</span>
			</span>
		</span>
	);
}
