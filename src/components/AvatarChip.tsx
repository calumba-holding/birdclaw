import { getInitials } from "#/lib/present";

export function AvatarChip({
	name,
	hue,
	size = "default",
}: {
	name: string;
	hue: number;
	size?: "default" | "large";
}) {
	return (
		<span
			className={
				size === "large" ? "avatar-chip avatar-chip-large" : "avatar-chip"
			}
			style={{ backgroundColor: `hsl(${hue} 72% 50%)` }}
		>
			{getInitials(name)}
		</span>
	);
}
