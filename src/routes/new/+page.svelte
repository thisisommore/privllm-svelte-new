<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { SERVER_PUB_CREDS } from '$lib/api/contants';
	import { logger } from '$lib/logger';
	import { XXDK } from '$lib/xxdk/xxdk.svelte';
	import { globalStore } from '../../store.svelte';
	import UI from './ui.svelte';
	let password = $state('');
</script>

<div>
	<UI
		onDoneClick={async () => {
			const initDone = localStorage.getItem('INIT_DONE');
			let xxdk: XXDK;

			if (initDone != 'true') {
				xxdk = await XXDK.new(password);
				globalStore.xxdk = xxdk;
				logger.log('[privllm] initXXDK completed');
				localStorage.setItem('INIT_DONE', 'true');
				await xxdk.newChat();
				await xxdk.send('Hello from SvelteKit!', SERVER_PUB_CREDS);
			} else {
				logger.log('[privllm] loadXXDK starting');
				xxdk = await XXDK.load(password);
				globalStore.xxdk = xxdk;
				await xxdk.loadChat(globalStore.selectedChat);
			}
			await goto(resolve('/chat'));
		}}
		bind:password
	/>
</div>
