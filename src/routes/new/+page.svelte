<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { SERVER_PUB_CREDS } from '$lib/api/contants';
	import { logger } from '$lib/logger';
	import { initXXDK, loadXXDK, progress, type XXDK } from '$lib/xxdk/index.svelte';
	import { globalStore } from '../../store.svelte';
</script>

<div class="flex h-full w-full flex-col items-center justify-center">
	<br />
	<button
		onclick={async () => {
			const initDone = localStorage.getItem('INIT_DONE');
			let xxdk: XXDK;

			if (initDone != 'true') {
				xxdk = await initXXDK();
				globalStore.xxdk = xxdk;
				logger.log('[privllm] initXXDK completed');
				localStorage.setItem('INIT_DONE', 'true');
				let chat = await xxdk.newChat();
				await chat.send('Hello from SvelteKit!', SERVER_PUB_CREDS);
			} else {
				logger.log('[privllm] loadXXDK starting');
				xxdk = await loadXXDK();
				globalStore.xxdk = xxdk;
				await xxdk.loadChat(globalStore.selectedChat);
			}
			await goto(resolve('/chat'));
		}}>Done</button
	>

	<div class="m-4 border-[0.1px] border-green-500">
		Status: <span id="status">{progress.status}</span>
	</div>
	<div class="m-4 border-[0.1px] border-green-500">
		Network is: <span id="status">{progress.isHealthy ? 'Healthy' : 'Unhealthy'}</span>
	</div>
</div>
