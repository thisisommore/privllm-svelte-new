<script lang="ts">
	import { globalStore } from '../../store.svelte';
	import { progress } from '$lib/xxdk/index.svelte';
	import { SERVER_PUB_CREDS } from '$lib/api/contants';
	import { onMount, tick } from 'svelte';
	import Ui from './ui.svelte';
	let isSending = $state(false);
	const newChat = async () => {
		await globalStore.xxdk!.newChat();
	};
	let messageInput = $state('');

	let viewport: HTMLDivElement | undefined = $state();
	onMount(async () => {
		await tick();
		viewport?.scrollTo({ top: viewport.scrollHeight, behavior: 'instant' });
	});

	let chatChanged = $state(true);
	$effect.pre(() => {
		globalStore.xxdk?.messages; // depend on messages
		const autoscroll =
			viewport && viewport.offsetHeight + viewport.scrollTop > viewport.scrollHeight - 50;

		if (autoscroll || (chatChanged && viewport != undefined)) {
			tick().then(() => {
				viewport.scrollTo({
					top: viewport.scrollHeight,
					behavior: chatChanged ? 'instant' : 'smooth'
				});
				chatChanged = false;
			});
		}
	});
</script>

<Ui
	bind:chatsElement={viewport}
	{isSending}
	bind:messageInput
	{newChat}
	selectChat={(i) => {
		chatChanged = true;
		globalStore.xxdk?.loadChat(i);
	}}
	sendMessage={async () => {
		if (messageInput.trim() == '') return;
		try {
			isSending = true;
			await globalStore.xxdk?.send(messageInput, SERVER_PUB_CREDS);
			messageInput = '';
		} finally {
			isSending = false;
		}
	}}
/>
