<script lang="ts">
	let messages = $state<DmMessage[]>([]);

	// Decode encrypted rows into display rows. Runs whenever the live query emits.
	async function decodeRows(rows: DmMessage[]) {
		if (!xxdkStore.dbCipher) return;
		messages = await Promise.all(
			rows.map(async (row) => ({
				...row,
				text: (await decodeDmText(row.text, xxdkStore.dbCipher!)).body
			}))
		);
	}

	onMount(() => {
		let unsubscribe = () => {};
		(async () => {
			if (!xxdkStore.dm) return;
			const db = await getDb(xxdkStore.dm.GetDatabaseName());
			// IMPORTANT: the querier must be synchronous up to the Dexie call so
			// PSD.subscr is active when toArray() runs — that is what registers the
			// observed range on "messages". notifyTableChanged() (fired from the WASM
			// EventUpdate callback) invalidates that exact range, re-running this.
			// Opening the DB inside the querier (await getDb()) would lose the zone
			// and the read would be observed by nothing.
			const sub = liveQuery(() => db.messages.toArray()).subscribe((rows) => decodeRows(rows));
			unsubscribe = () => sub.unsubscribe();
		})();
		return () => unsubscribe();
	});
	async function retry<T>(fn: () => Promise<T>, retries: number): Promise<T> {
		try {
			return await fn();
		} catch (err) {
			if (retries <= 0) throw err;
			logger.log(`Retrying... (${5 - retries + 1}/5)`);
			logger.log(err);
			await new Promise((res) => setTimeout(res, 5000)); // wait 1 second before retrying
			return retry(fn, retries - 1);
		}
	}
	import { logger } from '$lib/logger';
	import pako from 'pako';
	import DOMPurify from 'dompurify';
	const SANITIZE_CONFIG = {
		ALLOWED_TAGS: [
			'blockquote',
			'p',
			'a',
			'br',
			'code',
			'ol',
			'ul',
			'li',
			'pre',
			'i',
			'strong',
			'b',
			'em',
			'span',
			's',
			'mark',
			'h3'
		],
		ALLOWED_ATTR: ['target', 'href', 'rel', 'class', 'style'],
		ALLOW_DATA_ATTR: false
	};
	function sanitizeHtml(markup: string): string {
		return DOMPurify.sanitize(markup, SANITIZE_CONFIG);
	}
	function parseMessageType(decoded: string): {
		type?: MessageType;
		body: string;
		part?: number;
		totalParts?: number;
	} {
		if (!decoded.startsWith('[')) return { body: decoded };

		const closeIdx = decoded.indexOf(']');
		if (closeIdx === -1 || closeIdx + 1 >= decoded.length || decoded[closeIdx + 1] !== ' ') {
			return { body: decoded };
		}

		const inner = decoded.slice(1, closeIdx); // e.g. "PART" or "PART 1/5"
		const body = decoded.slice(closeIdx + 2); // skip "] "

		const spaceIdx = inner.indexOf(' ');
		if (spaceIdx === -1) {
			return { type: inner as MessageType, body };
		}

		const code = inner.slice(0, spaceIdx) as MessageType;
		const rest = inner.slice(spaceIdx + 1);
		const slashIdx = rest.indexOf('/');
		if (slashIdx === -1) {
			return { type: code, body };
		}

		const part = parseInt(rest.slice(0, slashIdx), 10);
		const totalParts = parseInt(rest.slice(slashIdx + 1), 10);
		return { type: code, body, part, totalParts };
	}
	const decoder = new TextDecoder();
	function base64ToUint8Array(b64: string): Uint8Array {
		const bin = atob(b64);
		const bytes = new Uint8Array(bin.length);
		for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
		return bytes;
	}
	async function decodeDmText(
		rawText: unknown,
		dbCipher: DbCipher
	): Promise<{ type?: MessageType; body: string; part?: number; totalParts?: number }> {
		let text: string;
		if (typeof rawText === 'string') {
			text = rawText;
		} else if (rawText instanceof Uint8Array) {
			text = decoder.decode(rawText);
		} else if (rawText instanceof ArrayBuffer) {
			text = decoder.decode(new Uint8Array(rawText));
		} else {
			return { body: '' };
		}
		try {
			const decrypted = await dbCipher.Decrypt(text);
			const decoded = decoder.decode(decrypted);
			try {
				const compressed = base64ToUint8Array(decoded);
				const decompressed = pako.inflate(compressed);
				return parseMessageType(sanitizeHtml(decoder.decode(decompressed)));
			} catch {
				return parseMessageType(decoded);
			}
		} catch {
			// Decryption failed — don't show raw encrypted text
			return { body: '' };
		}
	}
	type DbCipher = { GetID: () => number; Decrypt: (encrypted: string) => Promise<Uint8Array> };
	type MessageType =
		| 'AUTH_SUCCESS'
		| 'AUTH_FAILED'
		| 'AUTH_REQUIRED'
		| 'AUTH_TOKEN'
		| 'BALANCE'
		| 'INSUFFICIENT_BALANCE'
		| 'WELCOME'
		| 'LLM'
		| 'PART';
	import { onMount } from 'svelte';
	import { xxdkStore } from '../../store';
	import { getDb, type DmMessage } from '$lib/db';
	import { liveQuery } from 'dexie';
</script>

<h1>Chat</h1>
{#each messages as msg (msg.id)}
	<div class="message">
		<div class="header">
			<span class="role">{msg.status}</span>
			<span class="timestamp">{new Date(msg.timestamp).toLocaleString()}</span>
		</div>
		<div class="body" class:rich={msg.text}>{@html msg.text}</div>
	</div>
{/each}
