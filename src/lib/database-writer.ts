import { Effect } from "effect";
import { getNativeDb } from "./db";
import type { Database } from "./sqlite";

let writeTail: Promise<void> = Promise.resolve();

export function enqueueDatabaseWrite<T>(
	write: (db: Database) => T,
): Promise<T> {
	const pending = writeTail.then(() => {
		const db = getNativeDb({ seedDemoData: false });
		return db.transaction(() => write(db))();
	});
	writeTail = pending.then(
		() => undefined,
		() => undefined,
	);
	return pending;
}

export function databaseWriteEffect<T>(write: (db: Database) => T) {
	return Effect.tryPromise({
		try: () => enqueueDatabaseWrite(write),
		catch: (error) =>
			error instanceof Error ? error : new Error(String(error)),
	});
}

export async function drainDatabaseWrites() {
	await writeTail;
}

export function resetDatabaseWriterForTests() {
	writeTail = Promise.resolve();
}
