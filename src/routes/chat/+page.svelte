<script lang="ts">
	import { globalStore } from '../../store.svelte';
	import { progress } from '$lib/xxdk/index.svelte';

	const newChat = async () => {
		await globalStore.xxdk!.newChat();
	};
</script>

<h1>Chat</h1>
<button onclick={newChat}>New Chaty</button>
{globalStore.xxdk!.chats.length} Chats
{#each globalStore.xxdk!.messages as msg (msg.id)}
	<div class="message">
		<div class="header">
			<span class="role">{msg.status}</span>
			<span class="timestamp">{new Date(msg.timestamp).toLocaleString()}</span>
		</div>
		<div class="body" class:rich={msg.text}>{@html msg.text}</div>
	</div>
{/each}
{#each globalStore.xxdk!.chats as c (c.id)}
	<div class="message bg-pink-400">
		<div class="header">
			<span class="role">{c.title}</span>
		</div>
	</div>
{/each}
Status: {progress.status}
