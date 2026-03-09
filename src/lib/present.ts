export function formatCompactNumber(value: number) {
	return new Intl.NumberFormat("en", { notation: "compact" }).format(value);
}

export function formatShortTimestamp(value: string) {
	return new Intl.DateTimeFormat("en", {
		hour: "numeric",
		minute: "2-digit",
		month: "short",
		day: "numeric",
	}).format(new Date(value));
}

export function getInitials(value: string) {
	return value
		.split(" ")
		.map((part) => part[0] ?? "")
		.join("")
		.slice(0, 2);
}
