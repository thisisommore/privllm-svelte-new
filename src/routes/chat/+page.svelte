<script lang="ts">
	import { globalStore } from '../../store.svelte';
	import { progress } from '$lib/xxdk/index.svelte';
	import { SERVER_PUB_CREDS } from '$lib/api/contants';

	const newChat = async () => {
		await globalStore.xxdk!.newChat();
	};
	let messageInput = $state('');
</script>

<button onclick={newChat}>New Chat</button>
<div class="flex">
	<div>
		{#each globalStore.xxdk!.chats as c, i (c.id)}
			<div
				class={['message', globalStore.xxdk!.activeChatId == c.id ? 'bg-pink-400' : 'bg-green-400']}
				onclick={() => {
					globalStore.xxdk?.loadChat(i);
				}}
			>
				<div class="header">
					<span class="role">{c.title}</span>
				</div>
			</div>
		{/each}
	</div>
	<div>
		{#each globalStore.xxdk!.messages as msg (msg.id)}
			<div class="message">
				<div class="header">
					<span class="role">{msg.status}</span>
					<span class="timestamp">{new Date(msg.timestamp).toLocaleString()}</span>
				</div>
				<div class="body" class:rich={msg.text}>{@html msg.text}</div>
			</div>
		{/each}
		<input type="text" placeholder="Message ai" bind:value={messageInput} />
		<button
			onclick={() => {
				globalStore.xxdk?.send(messageInput, SERVER_PUB_CREDS);
				messageInput = '';
			}}>Send</button
		>
		<div>{progress.isHealthy ? 'Connected' : 'Connecting'}</div>
	</div>
</div>
