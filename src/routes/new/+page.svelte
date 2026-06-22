<script lang="ts">
	import { SERVER_PUB_CREDS } from '$lib/api/contants';
	import { logger } from '$lib/logger';
	import { initXXDK, progress } from '$lib/xxdk/index.svelte';
</script>

<div class="flex h-full w-full flex-col items-center justify-center">
	<br />
	<button
		onclick={async () => {
			const xxdk = await initXXDK();
			logger.log('[privllm] initXXDK completed');
			let chat = await xxdk.newChat();
			await chat.send('Hello from SvelteKit!', SERVER_PUB_CREDS);
		}}>Done</button
	>

	<div class="m-4 border-[0.1px] border-green-500">
		Status: <span id="status">{progress.status}</span>
	</div>
	<div class="m-4 border-[0.1px] border-green-500">
		Network is: <span id="status">{progress.isHealthy ? 'Healthy' : 'Unhealthy'}</span>
	</div>
</div>
