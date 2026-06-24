<script lang="ts">
	import { onMount } from 'svelte';
	import { globalStore } from '../../store.svelte';
	import { getDb, type DmMessage } from '$lib/db';
	import { liveQuery } from 'dexie';
	import { decodeDmText } from '$lib/xxdk/coding';
	import { progress } from '$lib/xxdk/index.svelte';

	let messages = $state<DmMessage[]>([]);

	// Decode encrypted rows into display rows. Runs whenever the live query emits.
	async function decodeRows(rows: DmMessage[]) {
		messages = await Promise.all(
			rows.map(async (row) => ({
				...row,
				text: await decodeDmText(row.text)
			}))
		);
	}

	onMount(() => {
		let unsubscribe = () => {};
		(async () => {
			if (!globalStore.xxdk!.dm) return;
			const db = await getDb(globalStore.xxdk!.dm.GetDatabaseName());
			const sub = liveQuery(() => db.messages.toArray()).subscribe((rows) => decodeRows(rows));
			unsubscribe = () => sub.unsubscribe();
		})();
		return () => unsubscribe();
	});

	const newChat = async () => {
		await globalStore.xxdk!.newChat();
	};
</script>

<h1>Chat</h1>
<button onclick={newChat}>New Chaty</button>
{globalStore.xxdk!.totalChats} Chats
{#each messages as msg (msg.id)}
	<div class="message">
		<div class="header">
			<span class="role">{msg.status}</span>
			<span class="timestamp">{new Date(msg.timestamp).toLocaleString()}</span>
		</div>
		<div class="body" class:rich={msg.text}>{@html msg.text}</div>
	</div>
{/each}
Status: {progress.status}
