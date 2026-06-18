import Dexie, { RangeSet, type EntityTable } from 'dexie';
import { logger } from './logger';

// NOTE: The schema below mirrors the IndexedDB stores created by the xxdk WASM
// client. Source of truth:
//   keith-xxdk-wasm/indexedDb/impl/dm/{init,model}.go
//   keith-xxdk-wasm/indexedDb/impl/channels/{init,model}.go
// Field names match the Go `json:"..."` struct tags exactly, since that is what
// the WASM client writes into IndexedDB. []byte values are base64 strings and
// time.Time values are RFC3339 strings once serialized into the store.

enum MessageType {
	Text = 1,
	Reply = 2,
	Reaction = 3,
	Silent = 4,
	Delete = 101,
	Pinned = 102,
	Mute = 103,
	AdminReplay = 104,
	FileTransfer = 40000
}

enum MessageStatus {
	Unsent = 0,
	Sent = 1,
	Delivered = 2,
	Failed = 3
}

// ---------------------------------------------------------------------------
// Direct Message database ("<tag>_speakeasy_dm")
// store "messages"      (keyPath "id", autoIncrement)
// store "conversations" (keyPath "pub_key")
// ---------------------------------------------------------------------------

type DmMessage = {
	id: number; // msgPkeyName, auto-increment
	message_id: string; // unique index
	conversation_pub_key: string; // index
	parent_message_id: string;
	timestamp: string;
	sender_pub_key: string; // index
	codeset_version: number;
	status: MessageStatus;
	text: string;
	type: MessageType;
	round: number;
};

type DmConversation = {
	pub_key: string; // convoPkeyName
	nickname: string;
	token: number;
	codeset_version: number;
	blocked_timestamp: string | null;
};

type DmDatabase = Dexie & {
	messages: EntityTable<DmMessage, 'id'>;
	conversations: EntityTable<DmConversation, 'pub_key'>;
};

/** Open the direct-message database ("<tag>_speakeasy_dm"). */
async function getDb(dbName: string): Promise<DmDatabase> {
	const db = new Dexie(dbName);
	await db.open()
	for (const table of db.tables) {
		if (!(table.name in db)) {
			(db as unknown as Record<string, unknown>)[table.name] = table;
		}
	}
	return db as unknown as DmDatabase;
}
/**
 * Notify Dexie's liveQuery subscribers that rows may have been inserted into
 * `tableName` by an external writer (e.g. the xxdk WASM client via go-indexeddb).
 *
 * Dexie only observes writes made through its own Table API, so WASM-backed
 * inserts are invisible to liveQuery by default. This fires the internal
 * `storagemutated` event with a whole-keyspace RangeSet, which causes every
 * liveQuery that read from the table to re-run — exactly what Dexie does
 * internally when first creating a database.
 *
 * Call this from the EventUpdate callback whenever eventType === 3000
 * (DmMessageReceived).
 */
function notifyTableChanged(db: Dexie, tableName: string): void {
	const everything = () => new RangeSet(-Infinity, [[[]]] as unknown as number);
	const parts: Record<string, ReturnType<typeof everything>> = {};

	// primary-key part (empty index name → trailing "/")
	parts[`idb://${db.name}/${tableName}/`] = everything();

	// every secondary index
	for (const idx of db.table(tableName).schema.indexes) {
		if (idx.name) {
			parts[`idb://${db.name}/${tableName}/${idx.name}`] = everything();
		}
	}

	logger.log({ msg: 'Notifying Dexie of external DB change', parts });

	// Route through Dexie's own external-notification entry point (the DOM event
	// it listens to for cross-tab / BroadcastChannel propagation). Dexie's handler
	// calls propagateLocally(), which does BOTH:
	//   1. globalEvents.storagemutated.fire(parts)  — wakes liveQuery listeners
	//   2. signalSubscribersNow(parts, true)        — evicts the read CACHE and
	//      signals subscribers whose observed ranges are tracked via cache entries
	//
	// A bare `Dexie.on('storagemutated').fire(parts)` only does step 1. Since the
	// "messages" table is cachable (inbound auto-increment PK, cache enabled), the
	// query's observed ranges live in a cache entry — so without step 2 the stale
	// cached result is never evicted and the live query never re-runs.
	globalThis.dispatchEvent(new CustomEvent('x-storagemutated-1', { detail: parts }));
}

export type { DmMessage }
export { getDb, notifyTableChanged };
